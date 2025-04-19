"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from "react";
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

// Fetch agents based on a random tenant
const fetchAgents = async (): Promise<Agent[]> => {
  try {
    const tenantsRes = await fetch("/api/gettenants");
    if (!tenantsRes.ok) throw new Error("Failed to fetch tenants");

    const tenants = await tenantsRes.json();
    if (!tenants || tenants.length === 0) throw new Error("No tenants available");

    const tenantId = tenants[Math.floor(Math.random() * tenants.length)].id;

    const agentsRes = await fetch("/api/getagents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId }),
    });

    if (!agentsRes.ok) throw new Error("Failed to fetch agents");
    const { agents } = await agentsRes.json();

    const formattedAgents = agents.map((agent: any) => ({
      ...agent,
      createdAt: new Date(agent.createdAt),
      updatedAt: new Date(agent.updatedAt),
    }));  

    return formattedAgents 

    
  } catch (error) {
    console.error("Error fetching agents:", error);
    return [];
  }
};


export function AgentManager({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const realtimeAgents = [
    {      
      name: "Strategic Machines",
      id: "000",
      tenantId: "Austin",
      api: "introduction", // WebRTC agent does not use a traditional API
      description: "Web Tour - Introducing the Strategic Machines Voice Agent site",
      isActive: true,
      configuration: { 
        specialities: ['voice', 'text streaming', 'video', 'DTMF'],
        capabilities: ['full text transcriptions', 'tool sets', 'tone selection']
      },
      component: "agents/metaagent",
      form: "agents/components/placeholder-form",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {      
      name: "Cypress Resorts",
      id: "001",
      tenantId: "Atlanta",
      api: "cypressResorts", // WebRTC agent does not use a traditional API
      description: "Intelligent interactions and agent switching at scale for any scenario.",
      isActive: true,
      configuration: { 
        specialities: ['voice', 'text streaming', 'video', 'DTMF'],
        capabilities: ['full text transcriptions', 'tool sets', 'tone selection']
      },
      component: "agents/metaagent",
      form: "agents/components/placeholder-form",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {      
      name: "University Security",
      id: "002",
      tenantId: "Chicago",
      api: "frontDeskAuthentication", // WebRTC agent does not use a traditional API
      description: "Intelligent authentication at your security desk",
      isActive: true,
      configuration: { 
        specialities: ['voice', 'text streaming', 'video', 'DTMF'],
        capabilities: ['full text transcriptions', 'tool sets', 'tone selection']
      },
      component: "agents/metaagent",
      form: "agents/components/placeholder-form",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {      
      name: "Altitude80",
      id: "003",
      tenantId: "Miami",
      api: "a80modernizer", // WebRTC agent does not use a traditional API
      description: "Modernization Agent for Legacy System analysis, exploration and updates",
      isActive: true,
      configuration: { 
        specialities: ['voice', 'text streaming', 'video', 'DTMF'],
        capabilities: ['full text transcriptions', 'tool sets', 'tone selection']
      },
      component: "agents/metaagent",
      form: "agents/components/placeholder-form",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
   

  ]

  // Initialize conversation on mount
  useEffect(() => {
    setMessages([]);
  }, []);

  // Fetch agents on mount  
  useEffect(() => {
    setAgents(realtimeAgents);
  }, []);
  
  
  // default context on start - loads the metaAgent which is infrastructure for Voice Agents
  useEffect(() => {
    if (agents.length > 0 && !activeAgent) {     
      const defaultAgent = realtimeAgents.find((agent) => agent.id === "001") || null;
      setActiveAgent(defaultAgent);
    }
  }, [agents, activeAgent]);

  // Function to send a message to the agent's API
  const sendMessageToAgentAPI = async (message: Message) => {
    if (!activeAgent || !activeAgent.api) return;

    try {
      const response = await fetch(activeAgent.api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "message" in message.context ? message.context.message : "",
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
        id: crypto.randomUUID(),
        role: "assistant",
        timestamp: new Date(),
        agentId: activeAgent.id,
        context: {
          ...data.context, // Store the full context object
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
      timestamp: new Date(),
      agentId: activeAgent?.id || null,
      context: {
        message: content, // Store user input in context.message
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

        // system generated message to note the context switch
        const switchMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          timestamp: new Date(),
          agentId: newAgent?.id || null,
          context: {
            name: "System",
            id: "system-message",
            confidence: 1.0, // highly confident
            message: `Switching to ${newAgent?.name} for better assistance.`,
          } as AgentResponseContext, // expected type
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
