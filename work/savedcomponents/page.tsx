'use client';

import { useState, useEffect } from 'react';
import { CloudSun, ChevronDown, ChevronUp } from 'lucide-react';
import Loading from '@/components/Loading';
import { Message, Agent } from '@/lib/types';
import ActivateButton from '@/components/Activate';
import DynamicIsland from '@/components/DynamicIsland';
import MetaAgent from '@/gallery/agents/metaagent';
import { useAgentManager } from '@/contexts/AgentManager';

interface StoredServer {
  id: string;
  url: string;
  name: string;
  connected: boolean;
}

interface Tool {
  name: string;
  inputSchema: object;
}

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [data, setData] = useState<MCPData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [toolLoading, setToolLoading] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [toolsVisible, setToolsVisible] = useState(false);
  const [isIslandOpen, setIsIslandOpen] = useState(false);
  const [isAgentSelected, setIsAgentSelected] = useState(false);

  // MCP Server State
  const [echoMessage, setEchoMessage] = useState('Hello MCP!');
  const [echoResult, setEchoResult] = useState('');
  const [alerts, setAlerts] = useState('');

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

  const executeToolCall = async (toolName: string, input: Record<string, any>) => {
    setToolLoading(toolName);
    try {
      const response = await fetch('/api/mcp/calltool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName, input }),
      });
      const result = await response.json();
      setEchoResult(result.content?.[0]?.text || 'No response');
    } catch (err) {
      console.error('Tool Call Error:', err);
      setEchoResult('Error executing tool');
    } finally {
      setToolLoading(null);
    }
  };

  const executeHealthCheck = async () => {
    setToolLoading('health');
    try {
      const response = await fetch('/api/mcp/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      setAlerts(result.health || 'No response');
    } catch (err) {
      console.error('Health Check Error:', err);
      setAlerts('Error checking health');
    } finally {
      setToolLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok) throw new Error('Failed to fetch response');

      const data = await response.json();

      const assistantMessage: Message = {
        id: data.id,
        role: 'assistant',
        content: data.content,
        annotations: data.annotations || undefined,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, something went wrong.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setInput('');
  };

  const handleAgentSelect = (agent: Agent) => {
    setActiveAgent(agent);
    setIsAgentSelected(true);
    setIsIslandOpen(false);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <DynamicIsland
        isOpen={isIslandOpen}
        onClose={() => setIsIslandOpen(false)}
        onAgentSelect={handleAgentSelect}
      />
      <div className="container mx-auto px-4 py-16 grow">
        <div className="flex flex-col items-center justify-center text-center space-y-8">
          <CloudSun className="h-20 w-20 text-sky-400" />
          <h1 className="text-4xl font-bold text-white">Cypress Resorts</h1>
          <div className="flex items-center justify-center">
            <ActivateButton
              onClick={() => setIsIslandOpen(true)}
              disabled={profileLoading}
              loading={profileLoading}
            />
          </div>

          {activeAgent && isAgentSelected && (
            <MetaAgent
              activeAgent={activeAgent}
              setActiveAgent={setActiveAgent}
              voice="ash"
            />
          )}

          <div className="w-full max-w-2xl p-4 border rounded-lg bg-gray-800 shadow-md">
            <button
              onClick={() => setToolsVisible(!toolsVisible)}
              className="flex items-center justify-between w-full p-3 text-left font-semibold text-white bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={profileLoading}
            >
              MCP Server Tools
              {toolsVisible ? <ChevronUp /> : <ChevronDown />}
            </button>

            {toolsVisible && (
              <div className="mt-4">
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                  {data?.tools.tools.map((tool) => (
                    <li key={tool.name}>
                      <strong>{tool.name}</strong>
                      <pre className="bg-gray-700 p-2 rounded overflow-auto text-sm text-gray-200">
                        {JSON.stringify(tool.inputSchema, null, 2)}
                      </pre>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="w-full max-w-2xl">
            <h2 className="text-2xl font-semibold mb-4 text-white">Execute Tools</h2>

            <div className="space-y-6">
              <div className="p-4 border rounded-lg bg-gray-800 shadow-md">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Translate a Query to Machine Language
                </h3>
                <input
                  type="text"
                  value={echoMessage}
                  onChange={(e) => setEchoMessage(e.target.value)}
                  className="w-full p-2 border rounded bg-gray-700 text-white placeholder-gray-400 disabled:opacity-50"
                  placeholder="Enter message..."
                  disabled={toolLoading === 'translate' || profileLoading}
                />
                <button
                  onClick={() => executeToolCall('translate', { text: echoMessage })}
                  className="mt-3 w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300 flex items-center justify-center"
                  disabled={toolLoading === 'translate' || profileLoading}
                >
                  {toolLoading === 'translate' ? (
                    <Loading className="scale-50 h-6 w-12" />
                  ) : (
                    'Run Translate'
                  )}
                </button>
                {echoResult && (
                  <p className="mt-3 p-3 bg-gray-700 rounded text-gray-200">
                    {echoResult}
                  </p>
                )}
              </div>

              <div className="p-4 border rounded-lg bg-gray-800 shadow-md">
                <h3 className="text-lg font-semibold text-white mb-2">Health Check</h3>
                <button
                  onClick={() => executeHealthCheck()}
                  className="mt-3 w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300 flex items-center justify-center"
                  disabled={toolLoading === 'health' || profileLoading}
                >
                  {toolLoading === 'health' ? (
                    <Loading className="scale-50 h-6 w-12" />
                  ) : (
                    'Check Health'
                  )}
                </button>
                {alerts && (
                  <p className="mt-3 p-3 bg-gray-700 rounded text-gray-200">
                    {JSON.stringify(alerts)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="w-full max-w-2xl bg-gray-800 rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-white mb-4">MCP Chat Demo</h1>

            <div className="h-96 overflow-y-auto border border-gray-700 rounded-md p-4 mb-4 bg-gray-900">
              {messages.length === 0 ? (
                <p className="text-gray-400">Ask me anything!</p>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`mb-2 p-2 rounded-md ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white ml-auto max-w-[80%]'
                        : 'bg-gray-700 text-gray-200 mr-auto max-w-[80%]'
                    }`}
                  >
                    {msg.content ?? 'No message content'}
                    {msg.role === 'assistant' &&
                      msg.annotations?.some((a) => a.finished) && (
                        <div className="mt-2">
                          <p className="font-semibold text-gray-300">Collected Parameters:</p>
                          <ul className="list-disc pl-4 text-gray-300">
                            {Object.entries(
                              msg.annotations[0]?.collectedInputs || {}
                            ).map(([key, value]) => (
                              <li key={key}>
                                {key}: {String(value)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g., Fetch the License file from pdhoward/proximity"
                className="flex-1 p-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white placeholder-gray-400 disabled:opacity-50"
                disabled={chatLoading || profileLoading}
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center"
                disabled={chatLoading || profileLoading}
              >
                {chatLoading ? <Loading className="scale-50 h-6 w-12" /> : 'Send'}
              </button>
            </form>
            <button
              onClick={handleReset}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;