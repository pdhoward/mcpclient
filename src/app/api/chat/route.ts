import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { fetchToolsAndClient } from "./helpers/fetchToolsAndClient";
import { getToolSchema } from "./helpers/getToolSchema";
import { getMissingParams } from "./helpers/getMissingParams";
import { extractParameters } from "./helpers/extractParameters";
import { detectToolIntent } from "./helpers/detectToolIntent";
import { handleContextSwitch } from "./helpers/handleContextSwitch";
import { handlePendingContextSwitch } from "./helpers/handlePendingContextSwitch";
import { Message, ToolSchema, State, ToolsAndClient } from "@/lib/types";

/*
// Creates a standardized JSON API response with a given message and status code.
// Used throughout the workflow to return responses to the client consistently.
*/
function createApiResponse(message: Message, status: number = 200): Response {
  return new Response(JSON.stringify(message), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/*
// Logs a step in the workflow with associated data for debugging and tracing.
// Provides visibility into the state and progress of the API request processing.
*/
function logStep(step: string, data: any): void {
  console.log(`🔹 ${step}:`, data);
}
/*
// Placeholder function to execute a tool (replace with actual implementation).
// Calls the specified tool with collected inputs using the provided 
// client and returns the result.
*/
async function callTool(
  toolName: string,
  inputs: Record<string, any>,
  client: ToolsAndClient["client"]
): Promise<string> {
  logStep("Executing tool", { toolName, inputs });
  // Example: Replace with actual tool execution logic
  // return await client.executeTool(toolName, inputs);
  return `Result from ${toolName} with inputs ${JSON.stringify(inputs)}`;
}


/*
// Phase 1: Parses the incoming request and fetches available tools and client.
// Extracts the message array and last user message, validates the input, and retrieves
// the tools and client needed for tool execution and intent detection.
*/
async function parseRequestAndFetchTools(req: Request): Promise<{
  messages: Message[];
  lastMessage: Message;
  tools: Array<{ name: string; inputSchema: ToolSchema }>;
  client: ToolsAndClient["client"];
}> {
  const { messages }: { messages: Message[] } = await req.json();
  if (!messages.length) {
    throw new Error("No messages provided");
  }
  const lastMessage = messages[messages.length - 1];
  logStep("User Last Message", lastMessage);

  const { tools: rawTools, client } = await fetchToolsAndClient();
  logStep("Raw tools from fetchToolsAndClient", rawTools);

   // Validate and filter tools array
   const tools = rawTools
   .filter((tool, index) => {
     if (!tool || !tool.name || !tool.inputSchema) {
       console.warn(`Invalid tool at index ${index}:`, tool);
       return false;
     }
     return true;
   })
   .map((tool) => ({
     name: tool.name,
     inputSchema: tool.inputSchema as ToolSchema,
   }));

 if (tools.length === 0) {
   throw new Error("No valid tools available after filtering");
 }

  logStep("Step 1: Tools fetched", { toolCount: tools.length });

  return { messages, lastMessage, tools, client };
}

/*
// Phase 2: Recovers the prior conversation state from message annotations.
// Retrieves the latest tool-input-state annotation to restore the current tool,
// collected inputs, and context switch status, initializing a default state if none exists.
*/
function recoverState(messages: Message[]): State {
  const previousAnnotations = messages
    .flatMap((m) => m.annotations || [])
    .filter((a) => a.type === "tool-input-state");

  const state: State = {
    toolName: undefined,
    toolSchema: null,
    collectedInputs: {},
    finished: false,
    contextStatePending: false,
    toolPending: undefined,
  };

  if (previousAnnotations.length > 0) {
    const latest = previousAnnotations[previousAnnotations.length - 1];
    state.toolName = latest.toolName;
    state.collectedInputs = latest.collectedInputs || {};
    state.finished = latest.finished || false;
    state.contextStatePending = latest.contextStatePending || false;
    state.toolPending = latest.toolPending || undefined;
    logStep("Step 2: Recovered state", state);
  }

  return state;
}

/*
// Phase 3: Updates the tool schema and identifies missing parameters.
// Fetches the schema for the current tool (if any) and checks which required parameters
// are still missing from the collected inputs, preparing for user prompting or tool execution.
*/
function updateSchemaAndParams(
  state: State,
  tools: Array<{ name: string; inputSchema: ToolSchema }>
): string[] {
  if (state.toolName) {
    state.toolSchema = getToolSchema(tools, state.toolName);
    if (!state.toolSchema) {
      throw new Error(`Tool schema for ${state.toolName} not found`);
    }
  }
  const missingParams = getMissingParams(state.toolSchema, state.collectedInputs);
  logStep("Step 3: Missing params", missingParams);
  return missingParams;
}
/*
// Phase 4: Handles context switching or confirmation for tool changes.
// Processes user input to confirm or cancel a pending tool switch, or initiates a new
// switch if the user requests a different tool, updating the state accordingly.
*/
async function handleContext(
  lastMessage: Message,
  tools: Array<{ name: string; inputSchema: ToolSchema }>,
  state: State,
  missingParams: string[]
): Promise<Message | null> {
  if (lastMessage.role !== "user") return null;

  const contextResult = state.contextStatePending
    ? await handlePendingContextSwitch(
        lastMessage,
        state.toolName,
        state.toolPending,
        state.collectedInputs,
        state.finished,
        missingParams
      )
    : await handleContextSwitch(
        lastMessage,
        tools,
        state.toolName,
        state.collectedInputs,
        state.finished,
        missingParams
      );

  if (contextResult.response) {
    state.toolName = contextResult.newToolName;
    state.collectedInputs = contextResult.newCollectedInputs;
    state.finished = contextResult.newFinished;
    if (state.toolName) {
      state.toolSchema = getToolSchema(tools, state.toolName);
      if (!state.toolSchema) {
        throw new Error(`Tool schema for ${state.toolName} not found after context switch`);
      }
    }
    return contextResult.response;
  }

  return null;
}

/*
// Phase 5: Detects the user's tool intent and initializes the tool state.
// Analyzes the user's message to identify the intended tool, sets up its schema and
// initial parameters, and returns an error message if no tool is detected.
*/
async function detectAndInitializeTool(
  lastMessage: Message,
  tools: Array<{ name: string; inputSchema: ToolSchema }>,
  state: State
): Promise<Message | null> {
  if (state.toolName || lastMessage.role !== "user") return null;

  state.toolName = await detectToolIntent(lastMessage.content, tools);
  logStep("Step 4: Intent detected", state.toolName);

  if (!state.toolName) {
    return {
      role: "assistant",
      content: "❌ No suitable tool detected. Please clarify your request.",
      timestamp: Date.now(),
    };
  }

  state.toolSchema = getToolSchema(tools, state.toolName);
  if (!state.toolSchema) {
    throw new Error(`Tool schema for ${state.toolName} not found`);
  }
  state.collectedInputs = await extractParameters(lastMessage.content, state.toolSchema);
  state.finished = false;
  logStep("Step 5: Initial inputs", state.collectedInputs);

  return null;
}

/*
// Phase 6: Updates collected inputs with new parameters from the user's message.
// Extracts additional parameters for the current tool based on the latest user input,
// merging them with existing inputs to progress toward tool execution.
*/
async function updateCollectedInputs(
  messages: Message[],
  lastMessage: Message,
  state: State
): Promise<void> {
  const hasPreviousState = messages.some((m) =>
    m.annotations?.some((a) => a.type === "tool-input-state")
  );
  if (
    !hasPreviousState ||
    lastMessage.role !== "user" ||
    !state.toolName ||
    !state.toolSchema
  ) {
    return;
  }

  const latestPrompt = `
    Given the current collected inputs:
    ${JSON.stringify(state.collectedInputs, null, 2)}
    
    And the schema:
    ${JSON.stringify(state.toolSchema, null, 2)}
    
    Extract any new parameters from this user message: "${lastMessage.content.replace(/"/g, '\\"')}"
    Respond with a VALID JSON object containing only the new parameters (e.g., {"owner": "machine"}).
    Return ONLY the raw JSON string, with no markdown, no extra text, and no explanations.
  `;
  try {
    const newParamsResult = await generateText({
      model: openai("gpt-4o"),
      temperature: 0,
      system: latestPrompt,
      messages: [{ role: "user", content: "Extract new parameters" }],
    });
    const newParams = JSON.parse(newParamsResult.text);
    state.collectedInputs = { ...state.collectedInputs, ...newParams };
    logStep("Step 6: Updated inputs", state.collectedInputs);
  } catch (e) {
    console.error("Failed to parse new params:", e);
  }
}

/*
// Phase 7: Checks for missing parameters required by the current tool.
// Validates the collected inputs against the tool's schema to identify any remaining
// parameters needed before execution, throwing an error if the schema is missing.
*/
function checkMissingParameters(state: State): string[] {
  if (!state.toolSchema && state.toolName) {
    throw new Error(`Tool schema for ${state.toolName} not found in parameter check`);
  }
  const missingParams = getMissingParams(state.toolSchema, state.collectedInputs);
  logStep("Step 7: Updated missing params", missingParams);
  logStep("Step 7 Continued: toolSchema and inputs collected", {
    toolSchema: state.toolSchema,
    collectedInputs: state.collectedInputs,
  });
  return missingParams;
}
/*
// Phase 8 & 9: Generates the final response based on the workflow state.
// Returns a success message if all parameters are collected, or prompts the user for
// the next missing parameter, including state annotations for persistence.
*/
async function generateResponse(state: State, missingParams: string[]): Promise<Message> {
  if (missingParams.length === 0) {
    return {
      role: "assistant",
      content: "✅ All parameters collected. Ready to proceed.",
      annotations: [
        {
          type: "tool-input-state",
          toolName: state.toolName,
          collectedInputs: state.collectedInputs,
          finished: true,
          contextStatePending: false,
          toolPending: undefined,
        },
      ],
      timestamp: Date.now(),
    };
  }

  const nextParam = missingParams[0];
  const paramDescription =
    state.toolSchema?.properties?.[nextParam]?.description || `the ${nextParam}`;

  const promptResponse = await generateText({
    model: openai("gpt-4o"),
    temperature: 1.0,
    system: `
      You are a helpful assistant guiding the user to provide missing parameters.
      Current collected inputs: ${JSON.stringify(state.collectedInputs, null, 2)}
      Missing parameter: ${nextParam}
      Description: ${paramDescription}
      
      Generate a natural, concise prompt asking the user to provide the missing parameter.
    `,
    messages: [{ role: "user", content: "" }],
  });

  return {
    role: "assistant",
    content: promptResponse.text,
    annotations: [
      {
        type: "tool-input-state",
        toolName: state.toolName,
        collectedInputs: state.collectedInputs,
        finished: false,
        contextStatePending: false,
        toolPending: undefined,
      },
    ],
    timestamp: Date.now(),
  };
}

/*
// Main API handler for the POST endpoint.
// Orchestrates a nine-phase workflow to process user messages, manage tool interactions,
// handle context switches, and collect parameters, returning appropriate responses or errors.
*/
export async function POST(req: Request) {
  try {
    console.log("🟡 POST started");

    // Phase 1: Parse request and fetch tools
    const { messages, lastMessage, tools, client } = await parseRequestAndFetchTools(req);

    // Phase 2: Recover prior state
    const state = recoverState(messages);

    // Phase 3: Update tool schema and missing params
    const missingParams = updateSchemaAndParams(state, tools);

    // Phase 4: Handle context switch
    const contextResponse = await handleContext(lastMessage, tools, state, missingParams);
    if (contextResponse) {
      return createApiResponse(contextResponse);
    }

    // Phase 5: Detect tool intent
    const intentResponse = await detectAndInitializeTool(lastMessage, tools, state);
    if (intentResponse) {
      return createApiResponse(intentResponse);
    }

    // Phase 6: Update collected inputs
    await updateCollectedInputs(messages, lastMessage, state);

    // Phase 7: Check missing parameters
    const updatedMissingParams = checkMissingParameters(state);

    // Phase 8 & 9: Generate response
    const response = await generateResponse(state, updatedMissingParams);
    return createApiResponse(response);
  } catch (error) {
    console.error("❌ Fatal error in POST handler:", error);
    const response: Message = {
      role: "assistant",
      content: error instanceof Error ? error.message : "Unknown error",
      timestamp: Date.now(),
    };
    return createApiResponse(response, 500);
  }
}