'use client';

import { useState, useEffect } from 'react';
import { CloudSun } from 'lucide-react';
import { Message, Agent } from '@/lib/types';
import ActivateButton from '@/components/Activate';
import DynamicIsland from '@/components/DynamicIsland';
import MetaAgent from '@/gallery/agents/metaagent';
import { useAgentManager } from '@/contexts/AgentManager';

interface MCPData {
  capabilities: {
    tools: Record<string, { description: string }>;
  };
  tools: {
    tools: Array<{
      name: string;
      inputSchema: {
        type: string;
        properties: Record<string, { type: string }>;
        required: string[];
        additionalProperties: boolean;
        $schema: string;
      };
    }>;
  };
}

const ChatPage = () => {
  const { agents, activeAgent, setActiveAgent } = useAgentManager();
  const [data, setData] = useState<MCPData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isIslandOpen, setIsIslandOpen] = useState(false);
  const [isAgentSelected, setIsAgentSelected] = useState(false); 

  // Fetch tool data from server
  useEffect(() => {
    fetch('/api/mcp/profile')
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setProfileLoading(false);
      })
      .catch((err) => {
        console.error('MCP Profile Error:', err);
        setProfileLoading(false);
      });
  }, []);

 
  const handleAgentSelect = (agent: Agent) => {
    setActiveAgent(agent);
    setIsAgentSelected(true);
    setIsIslandOpen(false);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
     
       <div className="container mx-auto px-4 py-8 lg:py-16 flex-1">
        <div className="flex flex-col items-center justify-center text-center space-y-8">
          <CloudSun className="h-20 w-20 text-sky-400" />
          <h1 className="text-4xl font-bold text-white">Cypress Resort</h1>
          <h3 className="text-xl font-bold text-white">Where Luxury Meets Nature</h3>
          <div className="flex items-center justify-center">
            <ActivateButton
              agents={agents}                 // from useAgentManager()
              setActiveAgent={setActiveAgent} // from context
              setIsAgentSelected={setIsAgentSelected}
              disabled={profileLoading}
              loading={profileLoading}/>
          </div>

          {activeAgent && isAgentSelected && (
            <MetaAgent
              activeAgent={activeAgent}
              setActiveAgent={setActiveAgent}
              voice="ash"
            />
          )}    
        </div>
      </div>
    </div>
  );
};

export default ChatPage;