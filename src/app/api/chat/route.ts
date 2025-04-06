// app/api/chat/route.ts
import { StreamData, streamText } from "ai";
import { openai } from "@ai-sdk/openai";

// Define the McpToolRegistry class (simplified for this example)
class McpToolRegistry {
  private tools: any[] = [];

  async refreshTools() {
    try {
      const response = await fetch("https://chaotic.ngrok.io/tools/list", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to fetch tools");
      const toolData = await response.json();
      this.tools = toolData; // Adjust based on actual MCP server response
    } catch (error) {
      console.error("Error refreshing tools:", error);
      this.tools = [];
    }
  }

  getVercelAiTools() {
    // Convert MCP tools to Vercel AI SDK format (hypothetical mapping)
    return this.tools.reduce((acc, tool) => {
      acc[tool.name] = {
        description: tool.description,
        parameters: tool.argsSchema || {}, // Adjust based on MCP tool structure
        execute: async (args: any) => {
          const res = await fetch(`https://chaotic.ngrok.io/tools/${tool.name}/execute`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(args),
          });
          return res.json();
        },
      };
      return acc;
    }, {} as Record<string, any>);
  }
}

const toolRegistry = new McpToolRegistry();

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Refresh tools from MCP server
  await toolRegistry.refreshTools();
  const tools = toolRegistry.getVercelAiTools();

  const data = new StreamData();

  const result = await streamText({
    model: openai("gpt-4o"), // Use "gpt-4o" for latest OpenAI model (adjust as needed)
    system:
      "You are a helpful assistant with access to tools from an MCP server at https://chaotic.ngrok.io. Use these tools to fetch data or perform tasks as requested.",
    messages,
    tools,
    maxSteps: 5,
    onStepFinish({ toolCalls, toolResults }) {
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