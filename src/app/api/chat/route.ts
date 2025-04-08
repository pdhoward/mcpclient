import { streamText, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

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
  const properties = schema?.properties ?? {};
  const required = schema?.required ?? [];

  const missing = required.filter((key: string) => {
    return inputs[key] === undefined || inputs[key] === null || inputs[key] === "";
  });

  console.log("🧩 Schema required:", required);
  console.log("🧩 Current inputs:", inputs);
  console.log("🧩 Missing fields:", missing);

  return missing;
}

// 🧪 Map tool schema to zod object
function buildZodSchema(schema: any) {
  const properties = schema?.properties ?? {};
  return z.object(
    Object.keys(properties).reduce((acc, key) => {
      const prop = properties[key];
      let zodType: z.ZodType<any>;
      switch (prop.type) {
        case "string": zodType = z.string(); break;
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

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];

    console.log("🟡 POST started");
    console.log("🔹 User message:", lastMessage);

    // 1. Fetch tools and client
    const { tools, client } = await fetchTools();
    if (!client) throw new Error("Failed to connect to MCP server");

    const toolMap = tools.reduce((acc, tool) => {
      acc[tool.name] = {
        description: tool.description || `Executes ${tool.name}`,
        parameters: tool.inputSchema?.properties || {},
        execute: async (args: any) => {
          return await client.callTool({ name: tool.name, arguments: args });
        },
      };
      return acc;
    }, {} as Record<string, any>);

    // 2. Recover prior state (tool intent + partial inputs)
    const previousAnnotations = messages
      .flatMap((m: any) => m.annotations || [])
      .filter((a: any) => a.type === "tool-input-state");

    let toolName: string | null = null;
    let collectedInputs: Record<string, any> = {};

    if (previousAnnotations.length > 0) {
      const latest = previousAnnotations[previousAnnotations.length - 1];
      toolName = latest.toolName;
      collectedInputs = latest.collectedInputs || {};
      console.log("🔄 Recovered state from annotations:", { toolName, collectedInputs });
    }

    // 3. If no tool intent yet, ask OpenAI
    if (!toolName && lastMessage.role === "user") {
      const intentDetection = await generateText({
        model: openai("gpt-4o"),
        temperature: 0,
        messages: [
          {
            role: "system",
            content: `You are a tool selector. Respond with the tool name or "unknown".`,
          },
          {
            role: "user",
            content: lastMessage.content,
          },
        ],
      });

      const intentToolName = intentDetection.text.trim();
      toolName = intentToolName === "unknown" ? null : intentToolName;
      console.log("✅ OpenAI fallback intent:", toolName);
    }

    if (!toolName) {
      return new Response(JSON.stringify({
        message: "❌ No suitable tool detected. Please clarify your request.",
      }), { status: 200 });
    }

    const toolSchema = getToolSchema(tools, toolName);

    const stream = await streamText({
      model: openai("gpt-4o"),
      system: `
You are a developer assistant. 
Help the user collect all required inputs for the "${toolName}" tool.
Tool schema: ${JSON.stringify(toolSchema)}.
Collected so far: ${JSON.stringify(collectedInputs)}.
Once inputs are complete, execute the tool.
      `,
      messages: [
        ...messages,
        {
          role: "system",
          content: `Tool selected: ${toolName}`,
        },
      ],
      tools: {
        [toolName]: toolMap[toolName],
      },
      maxSteps: 5,
      async onStepFinish({ toolCalls, toolResults, text, finishReason }) {
        try {
          console.log("🔁 streamText step finished");
          console.log("🧠 Assistant said:", text);
          console.log("🔧 toolCalls:", toolCalls);
          console.log("📦 toolResults:", toolResults);
          console.log("🏁 finishReason:", finishReason);
    
          const missing = getMissingParams(toolSchema, collectedInputs);
          console.log("🧩 Missing fields:", missing);
    
          if (toolCalls?.length) {
            console.log("🛠️ LLM triggered tool call");
          }
    
          if (toolName && missing.length === 0) {
            console.log("✅ All inputs collected. Tool should be executing.");
          } else {
            console.log("🧩 Waiting for more input from user.");
          }
    
          // ❗Do NOT return anything from here!
        } catch (err) {
          console.error("❌ onStepFinish error:", err);
        }
      },
    });

    console.log("✅ Stream complete");
    return stream.toDataStreamResponse();
  } catch (error) {
    console.error("❌ Fatal error in POST handler:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
