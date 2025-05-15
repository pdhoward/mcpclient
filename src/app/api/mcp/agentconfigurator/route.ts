
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

// Utility function to convert input schema to a Zod schema
function inputSchemaToZodSchema(inputSchema: LibraryTool['inputSchema']): z.ZodType<any> {
  const properties: Record<string, z.ZodType<any>> = {};

  for (const [key, param] of Object.entries(inputSchema.properties)) {
    let schema: z.ZodType<any>;

    switch (param.type) {
      case 'string':
        schema = z.string();
        if (param.enum) {
          schema = z.enum(param.enum as [string, ...string[]]);
        }
        break;
      case 'number':
        schema = z.number();
        if (param.minimum !== undefined) {
          schema = (schema as z.ZodNumber).min(param.minimum);
        }
        if (param.maximum !== undefined) {
          schema = (schema as z.ZodNumber).max(param.maximum);
        }
        break;
      case 'boolean':
        schema = z.boolean();
        break;
      case 'object':
        schema = z.object({});
        break;
      default:
        schema = z.any();
    }

    if (inputSchema.required?.includes(key)) {
      properties[key] = schema;
    } else {
      properties[key] = schema.optional();
    }
  }

  return z.object(properties);
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

  // Listen for SSE disconnection
  transport.onclose = () => {
    console.error("SSE connection lost. Clearing client instance...");
    clientInstance = null; // Reset the client instance on disconnect
  };

  await client.connect(transport);
  clientInstance = client;
  return client;
}

export async function GET() {   

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
    const [profiles, promptArray, stateMachines, resources, rawToolsResponse] = await Promise.all([
      fetchAgentProfiles(),
      client.listPrompts() as Promise<{ prompts: AgentPrompt[] }>,
      fetchStateMachines(),
      client.listResources(),
      client.listTools(),
    ]);
     
    const validatedResponse = ListToolsResponseSchema.parse(rawToolsResponse);
    const libraryTools: LibraryTool[] = validatedResponse.tools;

    // Assemble AgentConfig for each agent with a profile
    const configs: AgentConfig[] = profiles.map((profile: AgentProfile) => {
      
      // Access the prompts array inside promptArray
      const prompt = promptArray.prompts.find((p) => p.name === profile.name);
      const stateMachineData = stateMachines.find((sm) => sm.agentId === profile.name);

      // Transform libraryTools into OpenAITool format
      const agentTools: OpenAITool[] = libraryTools
        .filter((tool) => tool.agentId === profile.id)
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

      // Create toolLogic entries for each tool
      const toolLogic: AgentConfig['toolLogic'] = {};
      for (const tool of agentTools) {
        toolLogic[tool.name] = async (args: any, transcriptLogsFiltered: TranscriptItem[]) => {
          try {
            const result = await client.callTool({
              name: tool.name,
              arguments: args,
            });
            return result; // Return the result directly, as it's already in the format { content: [{ type: "text", text: string }] }
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

      const stateMachineString = stateMachineData?.stateMachine
        ? `\n# Conversation States\n${JSON.stringify(stateMachineData.stateMachine, null, 2)}`
        : "";

      const instructionsWithStateMachine = `${prompt?.instructions || ""}${stateMachineString}`;

      const downstreamAgents = (profile.downstreamAgentIds || [])
        .map((id: string) => {
          const downstreamProfile = profiles.find((p) => p.id === id);
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