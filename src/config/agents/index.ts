import { AllAgentConfigsType, AgentConfig } from "@/lib/types";
import introduction from "./strategicmachines"

async function fetchAgents(): Promise<AgentConfig[]> {
  try {
    const response = await fetch("/api/agents", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("Failed to fetch agents");
    const data = await response.json();
    return data.agents;
  } catch (error) {
    console.error("Error fetching agents:", error);
    return [];
  }
}

const cypressResorts = fetchAgents()

export const allAgentSets: AllAgentConfigsType = { 
  cypressResorts, 
  introduction, 
};

export const defaultAgentSetKey = "cypressResorts";
