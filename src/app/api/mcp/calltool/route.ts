import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const origin = 'https://chaotic.ngrok.io'

async function createConnectedClient() {
  const transport = new SSEClientTransport(new URL(`${origin}/messages`));
  const client = new Client(
    { name: 'CypressResorts', version: '1.0.0' },
    { capabilities: { prompts: {}, resources: {}, tools: {} } }
  );

  // Listen for SSE disconnection
  transport.onclose = () => {
    console.error("SSE connection lost. Notifying User...");
    throw new Error("MCP Server disconnected. Please try again later.");
  };

  await client.connect(transport);
  return client;
}

export async function POST(request: NextRequest) {
  const { toolName, input } = await request.json();

  let client;
  try {
    client = await createConnectedClient();
  } catch (error) {
    throw new Error(`Failed to connect to MCP server: ${error}`);
  }

  console.log(`----calling MCP Server----`)
  console.log(toolName, input)

  try {
    //const result = await client.callTool(input);
    const result = await client.callTool({
      name: toolName,
      arguments: { message: input }
    });

    return NextResponse.json(result);

  } catch(error) {
    console.log(error)
    throw new Error(`MCP Server tool execution failed: ${error}`);
  }  
}