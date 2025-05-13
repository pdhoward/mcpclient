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
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
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
        setLoading(false);
      })
      .catch((err) => {
        console.error('MCP Profile Error:', err);
        setLoading(false);
      });
  }, []);

  const executeToolCall = async (toolName: string, input: Record<string, any>) => {
    setLoading(true);
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
    }
    setLoading(false);
  };

  const executeHealthCheck = async () => {
    setLoading(true);
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
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

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
        role: "assistant",
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
          role: "assistant",
          content: "Sorry, something went wrong.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setInput('');
  };

  // Handle agent selection from DynamicIsland
  const handleAgentSelect = (agent: Agent) => {
    setActiveAgent(agent);
    setIsAgentSelected(true);
    setIsIslandOpen(false);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Main Page Dynamic Island for Agent Selection */}
      <DynamicIsland
        isOpen={isIslandOpen}
        onClose={() => setIsIslandOpen(false)}
        onAgentSelect={handleAgentSelect}
      />
      <div className="container mx-auto px-4 py-16 flex-grow">
        <div className="flex flex-col items-center justify-center text-center space-y-8">
          <CloudSun className="h-20 w-20 text-sky-400" />
          <h1 className="text-4xl font-bold text-white">MCP Control Panel</h1>
          <div className="relative w-108 h-20">
            <ActivateButton onClick={() => setIsIslandOpen(true)} />
          </div>

          {/* Render MetaAgent when an agent is selected */}
          {activeAgent && isAgentSelected && (
            <MetaAgent
              activeAgent={activeAgent}
              setActiveAgent={setActiveAgent}
              voice="ash"
            />
          )}

          {/* MCP Server Tools - Collapsible Section */}
          <div className="w-full max-w-2xl p-4 border rounded-lg bg-gray-800 shadow-md">
            <button
              onClick={() => setToolsVisible(!toolsVisible)}
              className="flex items-center justify-between w-full p-3 text-left font-semibold text-white bg-gray-700 rounded-md"
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

          {/* Tool Execution Forms */}
          <div className="w-full max-w-2xl">
            <h2 className="text-2xl font-semibold mb-4 text-white">Execute Tools</h2>

            <div className="space-y-6">
              {/* Translate Tool */}
              <div className="p-4 border rounded-lg bg-gray-800 shadow-md">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Translate a Query to Machine Language
                </h3>
                <input
                  type="text"
                  value={echoMessage}
                  onChange={(e) => setEchoMessage(e.target.value)}
                  className="w-full p-2 border rounded bg-gray-700 text-white placeholder-gray-400"
                  placeholder="Enter message..."
                />
                <button
                  onClick={() => executeToolCall('translate', { text: echoMessage })}
                  className="mt-3 w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
                  disabled={loading}
                >
                  {loading ? 'Running...' : 'Run Translate'}
                </button>
                {echoResult && (
                  <p className="mt-3 p-3 bg-gray-700 rounded text-gray-200">
                    {echoResult}
                  </p>
                )}
              </div>

              {/* Health Check */}
              <div className="p-4 border rounded-lg bg-gray-800 shadow-md">
                <h3 className="text-lg font-semibold text-white mb-2">Health Check</h3>
                <button
                  onClick={() => executeHealthCheck()}
                  className="mt-3 w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
                  disabled={loading}
                >
                  {loading ? 'Running...' : 'Check Health'}
                </button>
                {alerts && (
                  <p className="mt-3 p-3 bg-gray-700 rounded text-gray-200">
                    {JSON.stringify(alerts)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Chat Widget */}
          <div className="w-full max-w-2xl bg-gray-800 rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-white mb-4">MCP Chat Demo</h1>

            {/* Chat Display */}
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

            {/* Chat Input */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g., Fetch the License file from pdhoward/proximity"
                className="flex-1 p-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white placeholder-gray-400"
                disabled={isLoading}
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send'}
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