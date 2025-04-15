import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { fetchToolsAndClient } from "./helpers/fetchToolsAndClient";
import { getToolSchema } from "./helpers/getToolSchema";
import { getMissingParams } from "./helpers/getMissingParams";
import { extractParameters } from "./helpers/extractParameters";
import { detectToolIntent } from "./helpers/detectToolIntent";
import { handleContextSwitch } from "./helpers/handleContextSwitch";
import { handlePendingContextSwitch } from "./helpers/handlePendingContextSwitch";

// Define types
interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  annotations?: Annotation[];
}

interface Annotation {
  type: string;
  toolName?: string;
  collectedInputs?: Record<string, any>;
  finished?: boolean;
  contextStatePending?: boolean;
  toolPending?: string;
}

interface ToolSchema {
  properties?: Record<string, { type: string; description?: string }>;
  required?: string[];
}

interface State {
  toolName: string | undefined;
  toolSchema: ToolSchema | null;
  collectedInputs: Record<string, any>;
  finished: boolean;
  contextStatePending: boolean;
  toolPending: string | undefined;
}

interface ToolsAndClient {
  tools: Record<string, ToolSchema>;
  client: any; // Replace with actual client type if known
}

// Utility to create standardized API responses
function createApiResponse(message: Message, status: number = 200): Response {
  return new Response(JSON.stringify(message), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Utility for logging
function logStep(step: string, data: any): void {
  console.log(`🔹 ${step}:`, data);
}

// Phase 1: Parse request and fetch tools
async function parseRequestAndFetchTools(req: Request): Promise<{
  messages: Message[];
  lastMessage: Message;
  tools: ToolsAndClient["tools"];
  client: ToolsAndClient["client"];
}> {
  const { messages }: { messages: Message[] } = await req.json();
  if (!messages.length) {
    throw new Error("No messages provided");
  }
  const lastMessage = messages[messages.length - 1];
  logStep("User Last Message", lastMessage);

  const { tools, client } = await fetchToolsAndClient();
  logStep("Step 1: Tools fetched", { toolCount: Object.keys(tools).length });

  return { messages, lastMessage, tools, client };
}

// Phase 2: Recover prior state
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

// Phase 3: Update tool schema and missing params
function updateSchemaAndParams(
  state: State,
  tools: ToolsAndClient["tools"]
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

// Phase 4: Handle context switch
async function handleContext(
  lastMessage: Message,
  tools: ToolsAndClient["tools"],
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

// Phase 5: Detect tool intent
async function detectAndInitializeTool(
  lastMessage: Message,
  tools: ToolsAndClient["tools"],
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

// Phase 6: Update collected inputs
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

// Phase 7: Check missing parameters
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

// Phase 8 & 9: Generate response
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

// Main API handler
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