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
  
  // Transform the response from an object to an array
  const stateMachinesObj = await response.json();
  const stateMachinesArray = Object.entries(stateMachinesObj).map(([key, stateMachine]) => ({
    agentId: key.replace('StateMachine', ''), // e.g., "authenticationStateMachine" -> "authentication"
    stateMachine: stateMachine as StateMachineStep[],
  }));
  
  return stateMachinesArray;
}

export async function GET() {  
  console.log(`--------configurator start------`);

  const transport = new SSEClientTransport(new URL(`${origin}/sse`));  
  const client = new Client({ name: 'mcpmachine', version: '1.0.0' });
 
  await client.connect(transport); 
  try {
    // Fetch the profiles of active agents
    const profiles = await fetchAgentProfiles();
    const agentIds = profiles.map((p: { name: string }) => p.name);  

    // Fetch prompts
    const promptArray = await client.listPrompts();
    // Fetch state machines
    const stateMachines = await fetchStateMachines();  
    // Fetch resources
    const resources = await client.listResources();  
    // Fetch tools
    const tools = await client.listTools();  

    // Assemble AgentConfig for each agent with a profile
    const configs: AgentConfig[] = profiles.map((profile: AgentProfile) => {
      console.log(`-------------in api ---------------`);
      console.log(promptArray);

      // Access the prompts array inside promptArray
      const prompt = promptArray.prompts.find((p: any) => p.name === profile.name);
      const stateMachineData = stateMachines.find((sm) => sm.agentId === profile.name);

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
                  ...(value.maximum ? { maximum: view.maximum } : {}),
                ],
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