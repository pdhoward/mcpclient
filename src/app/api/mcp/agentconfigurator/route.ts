import { NextResponse, NextRequest } from 'next/server';
import { AgentConfig, AgentProfile, AgentPrompt, StateMachineStep } from "@/lib/types";
import { injectTransferTools } from "@/lib/utils";
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';


const origin = 'https://chaotic.ngrok.io';

// Fetch data from MCP server
async function fetchAgentProfiles(ids?: string[]): Promise<AgentProfile[]> {
    const url = new URL(`${origin}/agents`);
    if (ids) url.searchParams.append("id", ids.join(","));
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("Failed to fetch agent profiles");
    return response.json();
  }


async function fetchStateMachines(agentIds?: string[]): Promise<{ agentId: string; stateMachine: StateMachineStep[] }[]> {
    const url = new URL(`${origin}/machines`);
    if (agentIds) url.searchParams.append("agentId", agentIds.join(","));
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("Failed to fetch state machines");
    return response.json();
  }
 

export async function GET() {   

  const transport = new SSEClientTransport(new URL(`${origin}/sse`));  
 
  const client = new Client(
    { name: 'mcpmachine', version: '1.0.0' }    
  );
 
  await client.connect(transport); 
  try {
    // fetch the profiles of active agents
    const profiles = await fetchAgentProfiles();
    const agentIds = profiles.map((p: { name: string }) => p.name);  
    // fetch prompts
    const promptArray = await client.listPrompts();
    // fetch state machines
    const stateMachines = await fetchStateMachines();  
    // fetch resources
    const resources = await client.listResources();  
    // fetch tools
    const tools = await client.listTools();  

    // Assemble AgentConfig for each agent with a profile
    const configs: AgentConfig[] = profiles.map((profile) => {
        const prompt = promptArray.find((p: any) => p.agentId === profile.id);
        const stateMachineData = stateMachines.find((sm) => sm.agentId === profile.id);
        const agentTools = tools
          .filter((tool) => tool.agentId === profile.id)
          .map((tool) => ({
            type: "function",
            name: tool.name,
            description: tool.description,
            parameters: {
              type: "object",
              properties: Object.fromEntries(
                Object.entries(tool.parameters).map(([key, value]: [string, any]) => [
                  key,
                  {
                    type: value.type,
                    description: value.description,
                    ...(value.enum ? { enum: value.enum } : {}),
                    ...(value.minimum ? { minimum: value.minimum } : {}),
                    ...(value.maximum ? { maximum: value.maximum } : {}),
                  },
                ])
              ),
              required: Object.keys(tool.parameters).filter(
                (key) => tool.parameters[key].required !== false
              ),
              additionalProperties: false,
            },
          }));
  
        const stateMachineString = stateMachineData?.stateMachine
          ? `\n# Conversation States\n${JSON.stringify(stateMachineData.stateMachine, null, 2)}`
          : "";
  
        const instructionsWithStateMachine = `${prompt?.instructions || ""}${stateMachineString}`;
  
        const downstreamAgents = (profile.downstreamAgentIds || [])
          .map((id: any) => {
            const downstreamProfile = profiles.find((p) => p.id === id);
            return downstreamProfile
              ? { name: downstreamProfile.name, publicDescription: downstreamProfile.publicDescription }
              : null;
          })
          .filter((agent: any): agent is { name: string; publicDescription: string } => agent !== null);
  
        return {
          name: profile.name,
          publicDescription: profile.description,
          instructions: instructionsWithStateMachine,
          tools: agentTools,
          toolLogic: {},
          downstreamAgents,
        };
      });

    const agentconfig = injectTransferTools(configs);
    
    return Response.json(agentconfig);
  } catch (error) {
    console.error('Error fetching client data:', error);
  
    return new Response(
      JSON.stringify({ error: 'Failed to fetch data from client' }),
      { status: 500 }
    );
  }
  
}
