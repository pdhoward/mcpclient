import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

// Define types for clarity and type safety
interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  annotations?: ToolInputState[];
}

interface ToolInputState {
  type: "tool-input-state";
  toolName: string | null;
  collectedInputs: Record<string, any>;
  finished: boolean;
  contextStatePending?: boolean;
  toolPending?: string | null;
}

interface Tool {
  name: string;
  description?: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, any>;
    required?: string[];
  };
}

const origin = "https://chaotic.ngrok.io";

// Helper: Fetch tools and MCP client
async function fetchToolsAndClient(): Promise<{ tools: Tool[]; client: Client }> {
  try {
    const transport = new SSEClientTransport(new URL(`${origin}/sse`));
    const client = new Client({ name: "mcpmachine", version: "1.0.0" });
    await client.connect(transport);
    const { tools } = await client.listTools();
    return { tools: tools || [], client };
  } catch (error) {
    console.error("❌ Error fetching tools:", error);
    throw new Error("Failed to connect to MCP server");
  }
}

// Helper: Get tool schema by name
function getToolSchema(tools: Tool[], toolName: string | null): Tool["inputSchema"] | null {
  if (!toolName) return null;
  const tool = tools.find((t) => t.name === toolName);
  return tool?.inputSchema || null;
}

// Helper: Identify missing required fields
function getMissingParams(
  schema: { type: "object"; properties?: Record<string, any>; required?: string[] } | null,
  inputs: Record<string, any>
): string[] {
  if (!schema) return []; // Handle null schema by returning empty array
  const required = schema.required ?? [];
  return required.filter((key: string) => !inputs[key]);
}

// Helper: Map tool schema to Zod object
function buildZodSchema(schema: Tool["inputSchema"]): z.ZodObject<any> {
  if (!schema?.properties) return z.object({});
  const properties = schema.properties;
  return z.object(
    Object.keys(properties).reduce((acc, key) => {
      const prop = properties[key];
      let zodType: z.ZodType<any>;
      switch (prop.type) {
        case "string":
          zodType = z.string().min(1);
          break;
        case "number":
          zodType = z.number();
          break;
        case "boolean":
          zodType = z.boolean();
          break;
        case "enum":
          zodType = z.enum(prop.enum || [""]);
          break;
        default:
          zodType = z.any();
          break;
      }
      acc[key] = zodType;
      return acc;
    }, {} as Record<string, z.ZodType<any>>)
  );
}

// Helper: Extract parameters from user query
async function extractParameters(
  query: string,
  schema: Tool["inputSchema"]
): Promise<Record<string, any>> {
  const zodSchema = buildZodSchema(schema);
  const prompt = `
    Extract parameters from the user query based on this schema:
    ${JSON.stringify(schema, null, 2)}
    
    Query: "${query.replace(/"/g, '\\"')}"
    
    Respond with a VALID JSON object containing only the parameters explicitly mentioned in the query.
    If a parameter is not mentioned, exclude it from the response.
    Return ONLY the raw JSON string, with no markdown, no extra text, and no explanations.
    Example: {"repo": "proximity"}
  `;

  try {
    const result = await generateText({
      model: openai("gpt-4o"),
      temperature: 0,
      system: prompt,
      messages: [{ role: "user", content: "Extract parameters" }],
    });
    const parsed = JSON.parse(result.text);
    return zodSchema.partial().parse(parsed);
  } catch (e) {
    console.error("Failed to parse parameters:", e);
    return {};
  }
}

// Helper: Detect tool intent from user message
async function detectToolIntent(
  message: string,
  tools: Tool[]
): Promise<string | null> {
  const intentDetection = await generateText({
    model: openai("gpt-4o"),
    temperature: 0,
    system: `
      You are an expert assistant mapping user requests to tools.
      Respond ONLY with the tool name or "unknown".
      
      Examples:
      - "Translate this to Spanish" → translate
      - "Get README file from repo" → get_file_contents
      - "unknown task" → unknown
      
      Available tools:
      ${tools.map((t) => `- ${t.name}: ${t.description}`).join("\n")}
    `,
    messages: [{ role: "user", content: message }],
  });

  const toolName = intentDetection.text.trim();
  return toolName === "unknown" ? null : toolName;
}

// Helper: Check for context switch or execution request
async function handleContextSwitch(
  lastMessage: Message,
  tools: Tool[],
  toolName: string | null,
  collectedInputs: Record<string, any>,
  finished: boolean,
  missingParams: string[]
): Promise<{
  response: Message | null;
  newToolName: string | null;
  newCollectedInputs: Record<string, any>;
  newFinished: boolean;
}> {
  if (!toolName) {
    return {
      response: null,
      newToolName: null,
      newCollectedInputs: collectedInputs,
      newFinished: finished,
    };
  }

  const userMessage = lastMessage.content.trim().toLowerCase();

  // Check for execution request
  const executionKeywords = ["run it", "execute", "go ahead", "do it", "submit"];
  const isExecutionRequest = executionKeywords.some((keyword) =>
    userMessage.includes(keyword)
  );

  if (isExecutionRequest && missingParams.length === 0) {
    const executeResponse: Message = {
      role: "assistant",
      content: `Executing ${toolName} with params: ${JSON.stringify(collectedInputs)}`,
      timestamp: Date.now(),
      annotations: [
        {
          type: "tool-input-state",
          toolName: null,
          collectedInputs: {},
          finished: false,
          contextStatePending: false,
          toolPending: null,
        },
      ],
    };
    return {
      response: executeResponse,
      newToolName: null,
      newCollectedInputs: {},
      newFinished: false,
    };
  }

  // Check for potential context switch by looking for references to other tools
  let potentialNewTool: string | null = null;
  for (const tool of tools) {
    if (tool.name === toolName) continue; // Skip the current tool
    const toolNameLower = tool.name.toLowerCase();
    const descriptionLower = tool.description?.toLowerCase() || "";
    const toolKeywords = descriptionLower
      .split(" ")
      .filter((word) => word.length > 3);
    if (
      userMessage.includes(toolNameLower) ||
      toolKeywords.some((keyword) => userMessage.includes(keyword))
    ) {
      potentialNewTool = tool.name;
      break;
    }
  }

  if (potentialNewTool) {
    const confirmResponse: Message = {
      role: "assistant",
      content: `It looks like you might want to switch to ${potentialNewTool}. Do you want to proceed? (Say 'yes' to switch or 'no' to continue with ${toolName})`,
      timestamp: Date.now(),
      annotations: [
        {
          type: "tool-input-state",
          toolName,
          collectedInputs,
          finished,
          contextStatePending: true,
          toolPending: potentialNewTool,
        },
      ],
    };
    return {
      response: confirmResponse,
      newToolName: toolName,
      newCollectedInputs: collectedInputs,
      newFinished: finished,
    };
  }

  // No context switch or execution request; assume continuation
  return {
    response: null,
    newToolName: toolName,
    newCollectedInputs: collectedInputs,
    newFinished: missingParams.length === 0,
  };
}

// Helper: Handle pending context switch confirmation
async function handlePendingContextSwitch(
  lastMessage: Message,
  toolName: string | null,
  toolPending: string | null,
  collectedInputs: Record<string, any>,
  finished: boolean,
  missingParams: string[]
): Promise<{
  response: Message;
  newToolName: string | null;
  newCollectedInputs: Record<string, any>;
  newFinished: boolean;
}> {
  if (!toolName || !toolPending) {
    return {
      response: {
        role: "assistant",
        content: "Error: Invalid state for context switch confirmation.",
        timestamp: Date.now(),
        annotations: [
          {
            type: "tool-input-state",
            toolName,
            collectedInputs,
            finished,
            contextStatePending: false,
            toolPending: null,
          },
        ],
      },
      newToolName: toolName,
      newCollectedInputs: collectedInputs,
      newFinished: finished,
    };
  }

  const userResponse = lastMessage.content.trim().toLowerCase();
  const isConfirmation = ["yes", "y", "sure", "okay", "confirm"].some((word) =>
    userResponse.includes(word)
  );
  const isCancellation = ["no", "n", "cancel", "nevermind", "stop"].some((word) =>
    userResponse.includes(word)
  );

  if (isConfirmation) {
    // Proceed with the context switch
    const newToolName = toolPending;
    const newCollectedInputs = {};
    const newFinished = false;
    const switchResponse: Message = {
      role: "assistant",
      content: `Switching to ${newToolName}. Let's start with the required parameters. ${
        missingParams.length > 0 ? `Please provide the ${missingParams[0]}.` : "No parameters needed."
      }`,
      timestamp: Date.now(),
      annotations: [
        {
          type: "tool-input-state",
          toolName: newToolName,
          collectedInputs: newCollectedInputs,
          finished: newFinished,
          contextStatePending: false,
          toolPending: null,
        },
      ],
    };
    return {
      response: switchResponse,
      newToolName,
      newCollectedInputs,
      newFinished,
    };
  } else if (isCancellation) {
    // Cancel the context switch and continue with the current tool
    const cancelResponse: Message = {
      role: "assistant",
      content: `Okay, sticking with ${toolName}. ${
        missingParams.length > 0 ? `Please provide the ${missingParams[0]}.` : "All parameters collected. Ready to execute."
      }`,
      timestamp: Date.now(),
      annotations: [
        {
          type: "tool-input-state",
          toolName,
          collectedInputs,
          finished,
          contextStatePending: false,
          toolPending: null,
        },
      ],
    };
    return {
      response: cancelResponse,
      newToolName: toolName,
      newCollectedInputs: collectedInputs,
      newFinished: finished,
    };
  } else {
    // Unclear response to the confirmation prompt
    const unclearResponse: Message = {
      role: "assistant",
      content: `I'm not sure if you want to switch tasks. Please say 'yes' to switch to ${toolPending} or 'no' to continue with ${toolName}.`,
      timestamp: Date.now(),
      annotations: [
        {
          type: "tool-input-state",
          toolName,
          collectedInputs,
          finished,
          contextStatePending: true,
          toolPending,
        },
      ],
    };
    return {
      response: unclearResponse,
      newToolName: toolName,
      newCollectedInputs: collectedInputs,
      newFinished: finished,
    };
  }
}

// Main API handler
export async function POST(req: Request) {
  try {
    // Phase 1: Parse request and fetch tools
    const { messages }: { messages: Message[] } = await req.json();
    const lastMessage = messages[messages.length - 1];
    console.log("🟡 POST started");
    console.log("🔹 User Last Message:", lastMessage);

    const { tools, client } = await fetchToolsAndClient();
    console.log("🔹 Step 1: Tools fetched");

    // Phase 2: Recover prior state
    const previousAnnotations = messages
      .flatMap((m) => m.annotations || [])
      .filter((a) => a.type === "tool-input-state");

    let toolName: string | null = null;
    let collectedInputs: Record<string, any> = {};
    let finished = false;
    let contextStatePending = false;
    let toolPending: string | null = null;

    if (previousAnnotations.length > 0) {
      const latest = previousAnnotations[previousAnnotations.length - 1];
      toolName = latest.toolName;
      collectedInputs = latest.collectedInputs || {};
      finished = latest.finished || false;
      contextStatePending = latest.contextStatePending || false;
      toolPending = latest.toolPending || null;
      console.log("🔹 Step 2: Recovered state:", { toolName, collectedInputs, finished });
    }

    // Phase 3: Get tool schema and missing params (needed for context switch logic)
    const toolSchema = getToolSchema(tools, toolName);
    if (toolName && !toolSchema) {
      throw new Error(`Tool schema for ${toolName} not found`);
    }
    const missingParams = getMissingParams(toolSchema, collectedInputs);
    console.log("🔹 Step 3: Missing params:", missingParams);

    // Phase 4: Handle context switch or confirmation
    if (lastMessage.role === "user") {
      if (contextStatePending) {
        const { response, newToolName, newCollectedInputs, newFinished } =
          await handlePendingContextSwitch(
            lastMessage,
            toolName,
            toolPending,
            collectedInputs,
            finished,
            missingParams
          );
        if (response) {
          return new Response(JSON.stringify(response), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        toolName = newToolName;
        collectedInputs = newCollectedInputs;
        finished = newFinished;
      } else {
        const { response, newToolName, newCollectedInputs, newFinished } =
          await handleContextSwitch(
            lastMessage,
            tools,
            toolName,
            collectedInputs,
            finished,
            missingParams
          );
        if (response) {
          return new Response(JSON.stringify(response), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        toolName = newToolName;
        collectedInputs = newCollectedInputs;
        finished = newFinished;
      }
    }

    // Phase 5: Detect tool intent if no prior state
    if (!toolName && lastMessage.role === "user") {
      toolName = await detectToolIntent(lastMessage.content, tools);
      console.log("🔹 Step 4: Intent detected:", toolName);

      if (!toolName) {
        const response: Message = {
          role: "assistant",
          content: "❌ No suitable tool detected. Please clarify your request.",
          timestamp: Date.now(),
        };
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const schema = getToolSchema(tools, toolName);
      if (!schema) {
        throw new Error(`Tool schema for ${toolName} not found`);
      }
      collectedInputs = await extractParameters(lastMessage.content, schema);
      finished = false;
    }

    // Phase 6: Update collected inputs with new parameters
    if (previousAnnotations.length > 0 && lastMessage.role === "user" && toolName) {
      const latestPrompt = `
        Given the current collected inputs:
        ${JSON.stringify(collectedInputs, null, 2)}
        
        And the schema:
        ${JSON.stringify(toolSchema, null, 2)}
        
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
        collectedInputs = { ...collectedInputs, ...newParams };
        console.log("🔹 Step 5: Updated inputs:", collectedInputs);
      } catch (e) {
        console.error("Failed to parse new params:", e);
      }
    }

    // Phase 7: Check missing parameters
    const updatedMissingParams = getMissingParams(toolSchema, collectedInputs);
    console.log("🔹 Step 6: Updated missing params:", updatedMissingParams);

    // Phase 8: Respond based on state
    if (updatedMissingParams.length === 0) {
      const response: Message = {
        role: "assistant",
        content: "✅ All parameters collected. Ready to proceed.",
        annotations: [
          {
            type: "tool-input-state",
            toolName,
            collectedInputs,
            finished: true,
            contextStatePending: false,
            toolPending: null,
          },
        ],
        timestamp: Date.now(),
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Phase 9: Prompt user for the next missing parameter
    const nextParam = updatedMissingParams[0];
    const paramDescription =
      toolSchema?.properties?.[nextParam]?.description || `the ${nextParam}`;

    const promptResponse = await generateText({
      model: openai("gpt-4o"),
      temperature: 0.5,
      system: `
        You are a helpful assistant guiding the user to provide missing parameters.
        Current collected inputs: ${JSON.stringify(collectedInputs, null, 2)}
        Missing parameter: ${nextParam}
        Description: ${paramDescription}
        
        Generate a natural, concise prompt asking the user to provide the missing parameter.
      `,
      messages: [{ role: "user", content: "" }],
    });

    const response: Message = {
      role: "assistant",
      content: promptResponse.text,
      annotations: [
        {
          type: "tool-input-state",
          toolName,
          collectedInputs,
          finished: false,
          contextStatePending: false,
          toolPending: null,
        },
      ],
      timestamp: Date.now(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Fatal error in POST handler:", error);
    const response: Message = {
      role: "assistant",
      content: error instanceof Error ? error.message : "Unknown error",
      timestamp: Date.now(),
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}