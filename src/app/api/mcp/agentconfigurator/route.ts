import { 
  AgentConfig, 
  AgentProfile, 
  AgentPrompt, 
  StateMachineStep,  
  ListToolsResponseSchema,
  LibraryTool,
  OpenAITool,
  TranscriptItem
} from "@/lib/types";
import { injectTransferTools } from "@/lib/utils";
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { z } from 'zod';

const origin = 'https://chaotic.ngrok.io';

// Fetch data from MCP server
async function fetchAgentProfiles(ids?: string[]): Promise<AgentProfile[]> {
  const url = new URL(`${origin}/agents`);
  if (ids) url.searchParams.append("id", ids.join(","));
  console.log(`Fetching agent profiles: ${url}`);
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch agent profiles: ${response.status} - ${errorText}`);
  }
  return response.json();
}

async function fetchStateMachines(agentIds?: string[]): Promise<{ agentId: string; stateMachine: StateMachineStep[] }[]> {
  const url = new URL(`${origin}/machines`);
  if (agentIds) url.searchParams.append("agentId", agentIds.join(","));
  console.log(`Fetching state machines: ${url}`);
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch state machines: ${response.status} - ${errorText}`);
  }
  
  const stateMachinesObj = await response.json();
  const stateMachinesArray = Object.entries(stateMachinesObj).map(([key, stateMachine]) => ({
    agentId: key.replace('StateMachine', '').toLowerCase(),
    stateMachine: stateMachine as StateMachineStep[],
  }));
  
  return stateMachinesArray;
}

// Create a persistent Client instance
let clientInstance: Client<any, any, any> | null = null;

async function getClient(): Promise<Client<any, any, any>> {
  if (clientInstance) {
    return clientInstance;
  }

  const transport = new SSEClientTransport(new URL(`${origin}/sse`));
  const client = new Client(
    { name: 'CypressResorts', version: '1.0.0' },
    { capabilities: { prompts: {}, resources: {}, tools: {} } }
  );

  transport.onclose = () => {
    console.error("SSE connection lost. Clearing client instance...");
    clientInstance = null;
  };

  await client.connect(transport);
  clientInstance = client;
  return client;
}

// Recursively collect agent IDs, including downstream agents
function collectAgentIds(profile: AgentProfile, profiles: AgentProfile[], visited: Set<string> = new Set()): string[] {
  if (visited.has(profile.id)) return [];
  visited.add(profile.id);

  const ids = [profile.id];
  if (profile.downstreamAgentIds) {
    for (const downstreamId of profile.downstreamAgentIds) {
      const downstreamProfile = profiles.find(
        (p) => p.id === downstreamId || p.name.toLowerCase() === downstreamId.toLowerCase()
      );
      if (downstreamProfile) {
        ids.push(...collectAgentIds(downstreamProfile, profiles, visited));
      } else {
        console.warn(`Downstream agent not found: ${downstreamId}`);
      }
    }
  }
  return ids;
}

export async function GET(request: Request) {   
  const { searchParams } = new URL(request.url);
  const agentName = searchParams.get('api');
  
  if (!agentName) {
    return new Response(
      JSON.stringify({ error: 'Agent name is required' }),
      { status: 400 }
    );
  }

   if (agentName.toLowerCase() === 'strategicmachines') {
    try {
      const url = new URL(`${origin}/machine`);
      console.log(`Fetching machine config: ${url}`);
      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch machine config: ${response.status} - ${errorText}`);
      }

      const data = await response.json();     

      
      return Response.json(data);
    } catch (error) {
      console.error(`Error fetching strategicmachines config:`, error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch strategicmachines config' }),
        { status: 500 }
      );
    }
  }

  let client;
  try {
    client = await getClient();
  } catch (error) {
    console.error('Failed to connect to MCP server:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to connect to MCP server' }),
      { status: 500 }
    );
  }

  try {
    // Fetch all profiles to find the selected agent and its downstream agents
    const profiles = await fetchAgentProfiles();
    console.log('Profiles:', JSON.stringify(profiles.map(p => ({ id: p.id, name: p.name, downstreamAgentIds: p.downstreamAgentIds })), null, 2));
    
    const targetProfile = profiles.find((p) => p.name.toLowerCase() === agentName.toLowerCase());
    if (!targetProfile) {
      return new Response(
        JSON.stringify({ error: `Agent '${agentName}' not found` }),
        { status: 404 }
      );
    }

    // Collect IDs for the selected target agent and all downstream agents
    const agentIds = collectAgentIds(targetProfile, profiles);
    console.log(`Collected agent IDs: ${agentIds}`);

    // Fetch data for relevant agents
    const [promptArray, stateMachines, rawToolsResponse] = await Promise.all([
      client.listPrompts() as Promise<{ prompts: AgentPrompt[] }>,
      fetchStateMachines(agentIds),
      client.listTools(),
    ]);

    console.log('Prompts:', JSON.stringify(promptArray.prompts.map(p => ({ agentId: p.agentId, name: p.name })), null, 2));
    console.log('State Machines:', JSON.stringify(stateMachines.map(sm => ({ agentId: sm.agentId })), null, 2));
    console.log('Tools:', JSON.stringify(rawToolsResponse.tools.map(t => ({ name: t.name, agentId: t.agentId })), null, 2));

    const validatedResponse = ListToolsResponseSchema.parse(rawToolsResponse);
    const libraryTools: LibraryTool[] = validatedResponse.tools;

    // Build AgentConfig for the target agent and its downstream agents
    const configs: AgentConfig[] = profiles
      .filter((profile) => agentIds.includes(profile.id))
      .map((profile: AgentProfile) => {
        // Match prompt by agentId, name, or profile id
        const prompt = promptArray.prompts.find(
          (p) => 
            (p.agentId && p.agentId.toLowerCase() === profile.name.toLowerCase()) ||
            p.name.toLowerCase() === profile.name.toLowerCase() ||
            (p.agentId && p.agentId.toLowerCase() === profile.id.toLowerCase())
        );
        if (!prompt) {
          console.warn(`No prompt found for ${profile.name} (id: ${profile.id})`);
        }

        // Match state machine by agentId or profile name
        const stateMachineData = stateMachines.find(
          (sm) => 
            sm.agentId.toLowerCase() === profile.name.toLowerCase() ||
            sm.agentId.toLowerCase() === profile.id.toLowerCase()
        );
        if (!stateMachineData) {
          console.warn(`No state machine found for ${profile.name} (id: ${profile.id})`);
        }

        // Match tools by agentId or profile name
        const agentTools: OpenAITool[] = libraryTools
          .filter((tool) => 
            tool.agentId && (
              tool.agentId.toLowerCase() === profile.name.toLowerCase() ||
              tool.agentId.toLowerCase() === profile.id.toLowerCase()
            )
          )
          .map((tool) => ({
            type: "function",
            name: tool.name,
            description: tool.description,
            parameters: {
              type: tool.inputSchema.type,
              properties: tool.inputSchema.properties,
              required: tool.inputSchema.required || [],
              additionalProperties: tool.inputSchema.additionalProperties || false,
            },
          }));

        // Create toolLogic entries
        const toolLogic: AgentConfig['toolLogic'] = {};
        for (const tool of agentTools) {
          toolLogic[tool.name] = async (args: any, transcriptLogsFiltered: TranscriptItem[]) => {
            try {
              const result = await client.callTool({
                name: tool.name,
                arguments: args,
              });
              return result;
            } catch (error) {
              console.error(`Error executing tool ${tool.name}:`, error);
              return {
                content: [
                  {
                    type: "text" as const,
                    text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
                  },
                ],
              };
            }
          };
        }

        // Combine instructions with state machine
        const stateMachineString = stateMachineData?.stateMachine
          ? `\n# Conversation States\n${JSON.stringify(stateMachineData.stateMachine, null, 2)}`
          : "";
        const instructionsWithStateMachine = `${prompt?.instructions || ""}${stateMachineString}`;

        // Build downstreamAgents array
        const downstreamAgents = (profile.downstreamAgentIds || [])
          .map((id: string) => {
            const downstreamProfile = profiles.find(
              (p) => p.id === id || p.name.toLowerCase() === id.toLowerCase()
            );
            return downstreamProfile
              ? { name: downstreamProfile.name, publicDescription: downstreamProfile.description }
              : null;
          })
          .filter((agent): agent is { name: string; publicDescription: string } => agent !== null);

        return {
          name: profile.name,
          publicDescription: profile.description,
          instructions: instructionsWithStateMachine,
          tools: agentTools,
          toolLogic,
          downstreamAgents,
        };
      });

    // Log configs before transfer tools
    console.log('Configs before injectTransferTools:', JSON.stringify(configs.map(c => ({
      name: c.name,
      instructions: c.instructions.slice(0, 50) + (c.instructions.length > 50 ? '...' : ''),
      tools: c.tools.map(t => t.name),
      downstreamAgents: c.downstreamAgents 
        ? c.downstreamAgents.map(a => a.name)
        : []
    })), null, 2));

    // Apply transfer tools
    const agentConfig = injectTransferTools(configs);

    // Log final config
    console.log('Final Config:', JSON.stringify(agentConfig.map(c => ({
      name: c.name,
      instructions: c.instructions.slice(0, 50) + (c.instructions.length > 50 ? '...' : ''),
      tools: c.tools.map(t => t.name),
      downstreamAgents: c.downstreamAgents 
        ? c.downstreamAgents.map(a => a.name)
        : []
    })), null, 2));

    // Return all configs (target and downstream agents)
    return Response.json(agentConfig);
  } catch (error) {
    console.error(`Error assembling config for ${agentName}:`, error);
    return new Response(
      JSON.stringify({ error: `Failed to assemble config for ${agentName}` }),
      { status: 500 }
    );
  }
}