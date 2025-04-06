import { NextResponse } from 'next/server';
import { experimental_createMCPClient, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

// https://vercel.com/blog/ai-sdk-4-2#model-context-protocol-(mcp)-clients

let clientId = "clientA"

export async function GET() {
  console.log(`----entered profile route -----`)   
  const origin = 'https://chaotic.ngrok.io';

  const transport = new SSEClientTransport(new URL(`${origin}/sse`));
  
  console.log('---created transport instance ----')
  const client = new Client(
    { name: 'GithubMCP', version: '1.0.0' }    
  );
  console.log('---created client instance ----')

  await client.connect(transport);
  console.log('---connected to client ----')

  // List prompts
  const prompts = await client.listPrompts();
  console.log(prompts)

  
  // List resources
  //const resources = await client.listResources();
  //console.log(resources)

  // List resources
  const tools = await client.listTools();
  console.log(tools)

  // Read a resource
  //const resource = await client.readResource("file:///example.txt");

  // Call a tool
  // const result = await client.callTool({
  //   name: "example-tool",
  //   arguments: {
  //     arg1: "value"
  //   }
  // });
 

 return NextResponse.json({ tools });
}
