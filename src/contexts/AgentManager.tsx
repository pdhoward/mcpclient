"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Agent, Message } from "@/lib/types";

interface AgentManagerContextType {
  agents: Agent[];
  activeAgent: Agent | null;  
  setActiveAgent: (agent: Agent | null) => void;   
}

const AgentManagerContext = createContext<AgentManagerContextType | undefined>(undefined);

const saveConversation = async (messages: Message[]): Promise<void> => {
  console.log("Saving messages to DB:", messages);
  return Promise.resolve();
};

// Fetch agents from the MCP server endpoint
const fetchAgents = async (): Promise<Agent[]> => {
  try {
    const response = await fetch("/api/mcp/agents", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) throw new Error("Failed to fetch agent profiles");

    const profiles = await response.json();

    // Map profiles to Agent type, converting dates
    const formattedAgents: Agent[] = profiles.map((profile: any) => ({
      id: profile.id,
      name: profile.name,
      displayName: profile.displayName,
      description: profile.description,
      isActive: profile.active,
      configuration: profile.configuration,
      component: profile.component,
      form: profile.component, // Map component to form for compatibility
      createdAt: new Date(profile.createdAt),
      updatedAt: new Date(profile.updatedAt),
      avatar: profile.avatar,
      api: profile.configuration.api || "voiceAgent", // Fallback to voiceAgent
    }));

    return formattedAgents;
  } catch (error) {
    console.error("Error fetching agents:", error);
    return [];
  }
};

export function AgentManager({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  


  // Fetch agents on mount
  useEffect(() => {
    fetchAgents().then((fetchedAgents) => {
      setAgents(fetchedAgents);
    });
  }, []);
 

  const value: AgentManagerContextType = {
    agents,
    activeAgent,   
    setActiveAgent,      
  };

  return (
    <AgentManagerContext.Provider value={value}>
      {children}
    </AgentManagerContext.Provider>
  );
}

export function useAgentManager() {
  const context = useContext(AgentManagerContext);
  if (!context) {
    throw new Error("useAgentManager must be used within an AgentProvider");
  }
  return context;
}