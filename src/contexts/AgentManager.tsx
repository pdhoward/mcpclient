"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Agent, Message, UserMessageContext, AgentResponseContext } from "@/lib/types";

interface AgentManagerContextType {
  agents: Agent[];
  activeAgent: Agent | null;
  messages: Message[];
  setActiveAgent: (agent: Agent | null) => void;
  handleUserMessage: (message: string) => Promise<void>;
  clearConversation: () => void;
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
  const [messages, setMessages] = useState<Message[]>([]);

  // Initialize conversation on mount
  useEffect(() => {
    setMessages([]);
  }, []);

  // Fetch agents on mount
  useEffect(() => {
    fetchAgents().then((fetchedAgents) => {
      setAgents(fetchedAgents);
    });
  }, []);

  // Set default agent on start - CYPRESS RESORTS
  useEffect(() => {
    if (agents.length > 0 && !activeAgent) {
      const defaultAgent = agents.find((agent) => agent.id === "005") || null;
      setActiveAgent(defaultAgent);
    }
  }, [agents, activeAgent]);

  // Function to send a message to the agent's API
  const sendMessageToAgentAPI = async (message: Message) => {
    if (!activeAgent || !activeAgent.configuration.api) return;

    try {
      const response = await fetch(activeAgent.configuration.api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.context && "message" in message.context ? message.context.message : "",
          agent: {
            id: activeAgent.id,
            name: activeAgent.name,
            description: activeAgent.description,
            configuration: activeAgent.configuration,
          },
          conversationHistory: messages.slice(-10),
        }),
      });

      if (!response.ok) throw new Error("Agent API request failed");

      const data = await response.json();

      if (!data.context || !data.context.message) {
        console.warn("Agent API response missing context or response field.");
        return;
      }

      // Create an agent response message
      const agentMessage: Message = {
        id: activeAgent.id,
        role: "assistant",
        timestamp: Date.now(),       
        context: {
          ...data.context,
        },
      };

      // Update messages state
      setMessages((prev) => [...prev, agentMessage]);

      // Persist conversation
      await saveConversation([...messages, agentMessage]);

      return data.context;
    } catch (error) {
      console.error("Error sending message to agent API:", error);
    }
  };

  // Handle user messages and context switching
  const handleUserMessage = async (content: string) => {
    if (!content.trim()) return;

    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      timestamp: Date.now(),      
      context: {
        message: content,
      },
    };

    // Update messages state
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);

    try {
      await saveConversation(updatedMessages);

      // Check for agent switch
      const res = await fetch("/api/context-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          currentAgentId: activeAgent?.id,
          agents,
          conversationHistory: updatedMessages.slice(-5),
        }),
      });

      const { context } = await res.json();

      if (context.id && context.id !== activeAgent?.id) {
        const newAgent = agents.find((a) => a.id === context.id) || null;
        setActiveAgent(newAgent);

        // System-generated message to note the context switch
        const switchMessage: Message = {
          id: crypto.randomUUID(),
          role: "system",
          timestamp: Date.now(),         
          context: {
            name: "System",
            id: "system-message",
            confidence: 1.0,
            message: `Switching to ${newAgent?.name} for better assistance.`,
          } as AgentResponseContext,
        };

        const messagesWithSwitch = [...updatedMessages, switchMessage];
        setMessages(messagesWithSwitch);

        await saveConversation(messagesWithSwitch);

        await sendMessageToAgentAPI(switchMessage);
      } else {
        await sendMessageToAgentAPI(newMessage);
      }
    } catch (error) {
      console.error("Error handling user message:", error);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setActiveAgent(null);
  };

  const value: AgentManagerContextType = {
    agents,
    activeAgent,
    messages,
    setActiveAgent,
    handleUserMessage,
    clearConversation,
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