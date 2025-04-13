import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import {Message} from "@/lib/types"

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

// 🛠️ Fetch tools and MCP client
async function fetchTools() {
  try {
    const transport = new SSEClientTransport(new URL(`${origin}/sse`));
    const client = new Client({ name: "mcpmachine", version: "1.0.0" });
    await client.connect(transport);
    const { tools } = await client.listTools();
    return { tools: tools || [], client };
  } catch (error) {
    console.error("❌ Error fetching tools:", error);
    return { tools: [], client: null };
  }
}

// 🧠 Find tool schema by name
function getToolSchema(tools: Tool[], toolName: string) {
  const tool = tools.find((t) => t.name === toolName);
  return tool?.inputSchema || null;
}

// 🧩 Identify missing required fields
function getMissingParams(schema: any, inputs: Record<string, any>) {
  const required = schema?.required ?? [];
  return required.filter((key: string) => !inputs[key]);
}

// 🧪 Map tool schema to Zod object
function buildZodSchema(schema: any) {
  const properties = schema?.properties ?? {};
  return z.object(
    Object.keys(properties).reduce((acc, key) => {
      const prop = properties[key];
      let zodType: z.ZodType<any>;
      switch (prop.type) {
        case "string": zodType = z.string().min(1); break;
        case "number": zodType = z.number(); break;
        case "boolean": zodType = z.boolean(); break;
        case "enum": zodType = z.enum(prop.enum || [""]); break;
        default: zodType = z.any(); break;
      }
      acc[key] = zodType;
      return acc;
    }, {} as Record<string, z.ZodType<any>>)
  );
}

// 📦 Extract initial params from user query
async function extractInitialParams(query: string, schema: any) {
  const zodSchema = buildZodSchema(schema);
  const prompt = `
    Extract parameters from the user query based on this schema:
    ${JSON.stringify(schema, null, 2)}
    
    Query: "${query.replace(/"/g, '\\"')}"
    
    Respond with a VALID JSON object containing only the parameters explicitly mentioned in the query.
    If a parameter is not mentioned, exclude it from the response.
    Do NOT include markdown like \`\`\`json or extra text—just the raw JSON object.
    Example: {"repo": "proximity"}
  `;

  const result = await generateText({
    model: openai("gpt-4o"),
    temperature: 0,
    system: prompt,
    messages: [{ role: "user", content: "Extract parameters" }],
  });

  try {
    const parsed = JSON.parse(result.text);
    return zodSchema.partial().parse(parsed); // Validate and return partial object
  } catch (e) {
    console.error("Failed to parse initial params:", e);
    return {};
  }
}

export async function POST(req: Request) {
  try {
    const { messages }: { messages: Message[] } = await req.json();
    const lastMessage = messages[messages.length - 1];

    console.log("🟡 POST started");
    console.log("🔹 User Last Message:", lastMessage);

    // 1. Fetch tools and client
    const { tools, client } = await fetchTools();
    if (!client) throw new Error("Failed to connect to MCP server");

    console.log("🔹 Step 1 tool fetch completed");

    // 2. Recover prior state (tool intent + partial inputs)
    const previousAnnotations = messages
      .flatMap((m: any) => m.annotations || [])
      .filter((a: any) => a.type === "tool-input-state");

    let toolName: string | null = null;
    let collectedInputs: Record<string, any> = {};
    let finished = false;

    if (previousAnnotations.length > 0) {
      const latest = previousAnnotations[previousAnnotations.length - 1];
      toolName = latest.toolName;
      collectedInputs = latest.collectedInputs || {};
      console.log("🔄 Recovered state:", { toolName, collectedInputs });
    }
      ////////////////////////////////////////////////////
     //  2.5. Check for context switch or confirmation //
     ///////////////////////////////////////////////////
     if (lastMessage.role === "user" && toolName) {
      
       // Get tool schema and check missing params
      const toolSchema = getToolSchema(tools, toolName);
      if (!toolSchema) throw new Error(`Tool schema for ${toolName} not found`); 

      const missingParams = getMissingParams(toolSchema, collectedInputs);

      // Construct a detailed conversation history for context
      const conversationHistory = messages
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join("\n");
      
      // Call the LLM to check for context switch or execution intent  
      
      const contextCheck = await generateText({
        model: openai("gpt-4o"),
        temperature: 0,
        system: `
          You are an assistant helping to manage a workflow in an MCP server. Your task is to determine if the user's latest message indicates:
          1. A context switch (a new intent different from the current tool and conversation flow).
          2. A request to execute the current tool (if all required parameters are collected).
          3. Continuation of the current workflow (e.g., providing a parameter value).
          4. An unclear intent that requires clarification.
      
          **Current Context:**
          - Current tool: ${toolName}
          - Tool description: ${tools.find((t) => t.name === toolName)?.description || "N/A"}
          - Collected inputs: ${JSON.stringify(collectedInputs)}
          - Missing required parameters: ${missingParams.length > 0 ? missingParams.join(", ") : "None"}
          - Next expected parameter (if any): ${missingParams.length > 0 ? missingParams[0] : "None"}
          - Available tools:
            ${tools.map((t) => `- ${t.name}: ${t.description}`).join("\n")}
          - Conversation history:
            ${conversationHistory}
      
          **User's Latest Message:**
          "${lastMessage.content.replace(/"/g, '\\"')}"
      
          **Instructions:**
          - If the user's message suggests a new intent (e.g., switching to a different tool or task, like "fetch all repos" instead of "fetch a file"), respond with "switch".
          - If the user's message indicates a request to execute the current tool (e.g., "run it", "execute", "go ahead") and there are no missing parameters, respond with "execute".
          - If the user's message aligns with the current workflow (e.g., providing a value for the next expected parameter, such as a username, repo name, or file path), respond with "continue". Note: A single word or short phrase that fits the expected parameter type (e.g., a username like "octocat" for an "owner" parameter) should be considered a "continue".
          - If the intent is unclear (e.g., the message doesn't fit the expected parameter type or seems unrelated to the current workflow), respond with "unclear" and suggest asking the user for clarification.
      
          **Examples:**
          - If the next expected parameter is "owner" and the user says "octocat", respond with "continue".
          - If the user says "fetch all repos" while the current tool is "fetchGithubFile", respond with "switch".
          - If the user says "execute now" and there are no missing parameters, respond with "execute".
          - If the user says "what's the weather like?" while in the middle of a workflow, respond with "switch".
          - If the user says "huh?" or something unrelated to the expected parameter, respond with "unclear".
        `,
        messages: [{ role: "user", content: "" }],
      });
      
      const intentResult = contextCheck.text.trim();
      console.log("🔹 Context check:", intentResult);
      
      switch (intentResult) {
        case "switch":
          // Reset state for new intent
          toolName = null;
          collectedInputs = {};
          finished = false;
          const switchResponse: Message = {
            role: "assistant",
            content: "It looks like you want to switch tasks. What would you like to do next?",
            timestamp: Date.now(),
            annotations: [{ type: "tool-input-state", toolName: undefined, collectedInputs: {}, finished: false }],
          };
          return new Response(JSON.stringify(switchResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
      
        case "execute":
          if (missingParams.length === 0) {
            // Execute the tool since all parameters are collected
            const executeResponse: Message = {
              role: "assistant",
              content: `Executing ${toolName} with params: ${JSON.stringify(collectedInputs)}`,
              timestamp: Date.now(),
              annotations: [{ type: "tool-input-state", toolName: undefined, collectedInputs: {}, finished: false }],
            };
            // Reset state after execution
            toolName = null;
            collectedInputs = {};
            finished = false;
            return new Response(JSON.stringify(executeResponse), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
          break;
      
        case "continue":
          // Continue collecting parameters (handled in the next step of your workflow)
          finished = missingParams.length === 0;
          break;
      
        case "unclear":
          const unclearResponse: Message = {
            role: "assistant",
            content: "I'm not sure what you mean. Could you clarify your request?",
            timestamp: Date.now(),
            annotations: [{ type: "tool-input-state", toolName, collectedInputs, finished }],
          };
          return new Response(JSON.stringify(unclearResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
      
        default:
          // Handle unexpected intentResult values
          console.warn(`Unexpected intentResult: ${intentResult}`);
          const defaultResponse: Message = {
            role: "assistant",
            content: "I didn't understand your intent. Could you please rephrase or clarify what you'd like to do?",
            timestamp: Date.now(),
            annotations: [{ type: "tool-input-state", toolName, collectedInputs, finished }],
          };
          return new Response(JSON.stringify(defaultResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
      }
    }

    // 3. If no tool intent yet, detect it
    if (!toolName && lastMessage.role === "user") {
      const intentDetection = await generateText({
        model: openai("gpt-4o"),
        temperature: 0,
        system: `
          You are an expert assistant mapping user requests to tools.
          Respond ONLY with the tool name or "unknown".
          
          Examples:
          - "Translate this to Spanish" → translate
          - "Get README file from repo" → get_file
          - "unknown task" → unknown
          
          Available tools:
          ${tools.map((t) => `- ${t.name}: ${t.description}`).join("\n")}
        `,
        messages: [{ role: "user", content: lastMessage.content }],
      });

      toolName = intentDetection.text.trim() === "unknown" ? null : intentDetection.text.trim();
      console.log("✅ Step 2 Intent Detected:", toolName);

      if (toolName) {
        const schema = getToolSchema(tools, toolName);
        collectedInputs = await extractInitialParams(lastMessage.content, schema);
      }
    }

    if (!toolName) {
      console.log("🔹 Step 3 Tool Intent Not Deciphered");
      return new Response(
        JSON.stringify({ message: "❌ No suitable tool detected. Please clarify your request." }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Get tool schema and check missing params
    const toolSchema = getToolSchema(tools, toolName);
    if (!toolSchema) throw new Error(`Tool schema for ${toolName} not found`);   

    // 5. Update collected inputs from the latest user message (if we have prior state)
    if (previousAnnotations.length > 0 && lastMessage.role === "user") {
      const latestPrompt = `
        Given the current collected inputs:
        ${JSON.stringify(collectedInputs, null, 2)}
        
        And the schema:
        ${JSON.stringify(toolSchema, null, 2)}
        
        Extract any new parameters from this user message: "${lastMessage.content.replace(/"/g, '\\"')}"
        Respond with a VALID JSON object containing only the new parameters.(e.g., {"owner": "machine"}).
         Return ONLY the raw JSON string, with no markdown (e.g., no \`\`\`json), no extra text, and no explanations—just the JSON.
      `;
      const newParamsResult = await generateText({
        model: openai("gpt-4o"),
        temperature: 0,
        system: latestPrompt,
        messages: [{ role: "user", content: "Extract new parameters" }],
      });

      try {
        const newParams = JSON.parse(newParamsResult.text);
        collectedInputs = { ...collectedInputs, ...newParams };
        console.log("🔹 Parameter check: Inputs Collected", collectedInputs);
        
      } catch (e) {
        console.error("Failed to parse new params:", e);
      }
    }

    const missingParams = getMissingParams(toolSchema, collectedInputs);
    console.log("🔹 Step 4 - State of Missing Params:", JSON.stringify(missingParams));

    // 7. If all params are collected, signal readiness (but don’t execute yet)
    if (missingParams.length === 0) {
      console.log("🔹 Step Finished - all Params collected:");
      const response: Message = {
        role: "assistant",
        content: "✅ All parameters collected. Ready to proceed.",
        annotations: [{
          type: "tool-input-state",
          toolName,
          collectedInputs,
          finished: true,
        }],
        timestamp: Date.now(),
      };
  
      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
      
    }  
   
    // 8. Prompt user for the next missing parameter
    const nextParam = missingParams[0];
    const paramDescription = toolSchema.properties && toolSchema.properties[nextParam]?.description 
      ? toolSchema.properties[nextParam].description 
      : `the ${nextParam}`;

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
      messages: [{ role: "user", content: "" }], // placeholder
    });

    const response: Message = {
      role: "assistant",
      content: promptResponse.text,
      annotations: [{
        type: "tool-input-state",
        toolName,
        collectedInputs,
        finished: false,
      }],
      timestamp: Date.now(),
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Fatal error in POST handler:", error);
    const response: Message = {
      role: "assistant",
      content: error instanceof Error ? error.message : "Unknown error",
      timestamp: Date.now(),
    };
    return new Response(
      JSON.stringify(response),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}