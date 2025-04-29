import { NextResponse } from 'next/server';
import { experimental_createMCPClient, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import {AgentPrompt} from "@/lib/types"

// https://vercel.com/blog/ai-sdk-4-2#model-context-protocol-(mcp)-clients

const origin = 'https://chaotic.ngrok.io';

async function fetchAgentPrompts(agentIds?: string[]): Promise<AgentPrompt[]> {
  const url = new URL(`${origin}/prompts`);
  if (agentIds) url.searchParams.append("agentId", agentIds.join(","));

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.MCP_API_KEY}` },
  });
  if (!response.ok) throw new Error("Failed to fetch agent prompts");
  const prompts = await response.json();
  //console.log("Fetched prompts:", JSON.stringify(prompts, null, 2));
  return prompts;
}

export async function GET() {   

  const transport = new SSEClientTransport(new URL(`${origin}/sse`));  
 
  const client = new Client(
    { name: 'mcpmachine', version: '1.0.0' }    
  );
 
  await client.connect(transport); 
  try {
    // List prompts
    const promptArray = await client.listPrompts();
    const agentIds = promptArray.prompts.map((p: { name: string }) => p.name);
    // Fetch full prompts from /api/agents
    const prompts = await fetchAgentPrompts(agentIds);
  
    // List resources
    const resources = await client.listResources();
  
    // List tools
    const tools = await client.listTools();  
    
    return Response.json({ tools });
  } catch (error) {
    console.error('Error fetching client data:', error);
  
    return new Response(
      JSON.stringify({ error: 'Failed to fetch data from client' }),
      { status: 500 }
    );
  }
  
}
