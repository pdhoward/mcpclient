// fetchToolsAndClient.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const origin = "https://chaotic.ngrok.io";

export async function fetchToolsAndClient(): Promise<{ tools: any[]; client: Client }> {
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
