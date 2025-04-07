// app/api/chat/route.ts
import { StreamData, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Function to fetch tools from MCP server
async function fetchTools(): Promise<any[]> {
  try {
    const response = await fetch("https://chaotic.ngrok.io/tools/list", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("Failed to fetch tools");
    return await response.json(); // Expecting [{ name, description, argsSchema }]
  } catch (error) {
    console.error("Error fetching tools:", error);
    return [];
  }
}

// Function to convert MCP tools to Vercel AI SDK format
function getVercelAiTools(tools: any[]): Record<string, any> {
  return tools.reduce((acc, tool) => {
    acc[tool.name] = {
      description: tool.description || `Executes ${tool.name}`,
      parameters: tool.argsSchema || {},
      execute: async (args: any) => {
        const res = await fetch(`https://chaotic.ngrok.io/tools/${tool.name}/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
        });
        if (!res.ok) throw new Error(`Tool ${tool.name} execution failed`);
        return res.json();
      },
    };
    return acc;
  }, {} as Record<string, any>);
}

// Function to get a tool’s schema by name
function getToolSchema(tools: any[], toolName: string): any | null {
  const tool = tools.find((t) => t.name === toolName);
  return tool?.argsSchema || null;
}

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Fetch tools from MCP server
  const tools = await fetchTools();
  const vercelAiTools = getVercelAiTools(tools);

  const data = new StreamData();

  // Analyze message history to determine intent and state
  const lastMessage = messages[messages.length - 1];
  const previousAnnotations = messages
    .flatMap((msg: any) => msg.annotations || [])
    .filter((ann: any) => ann.type === "tool-input-state");

  let toolName: string | null = null;
  let collectedInputs: Record<string, any> = {};

  // Check if we're already collecting inputs for a tool
  if (previousAnnotations.length > 0) {
    const latestState = previousAnnotations[previousAnnotations.length - 1];
    toolName = latestState.toolName;
    collectedInputs = latestState.collectedInputs || {};
  }

 // If no tool is selected yet, detect intent
if (!toolName && lastMessage.role === "user") {
  const intentDetection = await streamText({
    model: openai("gpt-4o"),
    system: `You are an assistant that identifies user intent and selects the appropriate tool from: ${JSON.stringify(Object.keys(vercelAiTools))}. Respond with the tool name or "unknown" if unclear.`,
    messages: [{ role: "user", content: lastMessage.content }],
  });
  const intentResult = await intentDetection.text; // Call text() as a method
  toolName = intentResult.trim() === "unknown" ? null : intentResult.trim();
}

  const result = await streamText({
    model: openai("gpt-4o"),
    system: `
      You are a helpful assistant with access to tools from an MCP server at https://chaotic.ngrok.io.
      Your task is to:
      1. If no tool is selected, confirm the tool with the user or suggest one.
      2. If a tool is selected, check its schema and prompt the user for any missing required inputs.
      3. Once all inputs are collected, execute the tool.
      Available tools: ${JSON.stringify(Object.keys(vercelAiTools))}.
    `,
    messages: [
      ...messages,
      ...(toolName
        ? [{
            role: "system",
            content: `Selected tool: ${toolName}. Schema: ${JSON.stringify(getToolSchema(tools, toolName))}. Collected inputs so far: ${JSON.stringify(collectedInputs)}.`,
          }]
        : []),
    ],
    tools: vercelAiTools,
    maxSteps: 5,
    async onStepFinish({ text, toolCalls, toolResults }) {
      if (toolName && !toolCalls?.length) {
        // LLM responded with text, likely prompting for input
        const schema = getToolSchema(tools, toolName);
        if (schema) {
          try {
            // Attempt to parse user input from the last message
            const potentialInput = z.object(schema.shape).partial().parse(lastMessage.content);
            collectedInputs = { ...collectedInputs, ...potentialInput };
          } catch {
            // If parsing fails, assume it's not an input yet
          }

          const missingFields = Object.keys(schema.shape).filter(
            (key) => schema.shape[key].isOptional() ? false : !(key in collectedInputs)
          );

          if (missingFields.length === 0) {
            // All inputs collected, execute the tool
            const toolCall = {
              toolCallId: `manual_${Date.now()}`,
              toolName,
              args: collectedInputs,
            };
            const toolResult = await vercelAiTools[toolName].execute(collectedInputs);
            data.appendMessageAnnotation({
              type: "tool-status",
              toolCalls: [toolCall],
              toolResults: [{ result: toolResult, toolCallId: toolCall.toolCallId }],
            });
            toolName = null; // Reset after execution
            collectedInputs = {};
          } else {
            // Prompt for missing fields
            data.appendMessageAnnotation({
              type: "tool-input-state",
              toolName,
              collectedInputs,
              missingFields,
            });
          }
        }
      }

      if (toolCalls?.length) {
        console.log("Tool calls:", JSON.stringify(toolCalls));
        console.log("Tool results:", JSON.stringify(toolResults));
        data.appendMessageAnnotation({
          type: "tool-status",
          toolCalls: toolCalls.map((call) => ({
            toolCallId: call.toolCallId,
            toolName: call.toolName,
            args: call.args,
          })),
          toolResults,
        });
      }
    },
    onFinish() {
      data.close();
    },
  });

  return result.toDataStreamResponse({
    data,
    getErrorMessage: (error: unknown) => {
      if (error instanceof Error) {
        switch (error.name) {
          case "NoSuchToolError":
            return "The requested tool is not available.";
          case "InvalidToolArgumentsError":
            return "Invalid arguments provided for the tool.";
          case "ToolExecutionError":
            return "An error occurred while executing the tool.";
          case "ToolCallRepairError":
            return "Failed to repair the tool call.";
          default:
            return `An unexpected error occurred: ${error.message}`;
        }
      }
      return "An unknown error occurred.";
    },
  });
}