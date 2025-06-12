import {useEffect} from "react"
import {AgentConfiguration} from "./db/schemas/AgentTypes"

async function fetchAgentConfig(profileId: string): Promise<AgentConfiguration | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(`/api/agents/configurations/${profileId}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`Failed to fetch config: ${response.status} ${response.statusText}`);
    }
    const { configuration } = await response.json();
    return configuration as AgentConfiguration;
  } catch (error) {
    console.error('Error fetching agent config:', error);
    return {
      id: `fallback-${profileId}`,
      profileId,
      name: "fallbackAgent",
      publicDescription: "Fallback agent configuration",
      instructions: "This is a fallback agent. Limited functionality available.",
      tools: [],
      downstreamAgents: [],
      metadata: {
        version: "1.0.0",
        updatedAt: new Date().toISOString(),
      },
      isSupervisor: false,
      tenantId: "default",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

/*
useEffect(() => {
  if (activeAgent?.id && activeAgent.id !== hasFetchedConfig) {
    fetchAgentConfig(activeAgent.id).then((config) => {
      if (config) {
        setSelectedAgentName(config.name);
        setSelectedAgentConfigSet([config]);
        setHasFetchedConfig(activeAgent.id);
        setUserDisconnected(false);
      } else {
        console.error('Failed to fetch agent configuration:', activeAgent.id);
        setActiveAgent(null); // Reset or show error UI
      }
    });
  }
}, [activeAgent?.id]);

*/