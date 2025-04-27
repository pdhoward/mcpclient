import { NextResponse } from 'next/server';
import { experimental_createMCPClient as createMCPClient, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

// https://vercel.com/blog/ai-sdk-4-2#model-context-protocol-(mcp)-clients

let clientId = "clientA"

export async function GET() { 
  const origin = 'https://chaotic.ngrok.io';

  const transport = new SSEClientTransport(new URL(`${origin}/sse`));  
 
  const client = new Client(
    { name: 'mcpmachine', version: '1.0.0' }    
  );

  await client.connect(transport);   

  try {
    // List prompts
    const prompts = await client.listPrompts();
    console.log(JSON.stringify(prompts, null, 2))      
    
    return Response.json({ prompts });
  } catch (error) {
    console.error('Error fetching client data:', error);
  
    return new Response(
      JSON.stringify({ error: 'Failed to fetch data from client' }),
      { status: 500 }
    );
  }
  
}
