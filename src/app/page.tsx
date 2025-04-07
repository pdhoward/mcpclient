'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useEffect } from 'react';
import { CloudSun, ChevronDown, ChevronUp } from 'lucide-react';
import Loading from '@/components/Loading';

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

// provider management
//https://sdk.vercel.ai/docs/ai-sdk-core/provider-management#combining-custom-providers-provider-registry-and-middleware

const ChatPage = () => {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [data, setData] = useState<MCPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [toolsVisible, setToolsVisible] = useState(false);

  // MCP Server State
  const [serverUrl, setServerUrl] = useState('');
  const [serverStatus, setServerStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');
  const [connectedServers, setConnectedServers] = useState<StoredServer[]>([]);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [serverTools, setServerTools] = useState<Tool[]>([]);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [toolArgs, setToolArgs] = useState<string>('');
  const [toolResult, setToolResult] = useState<any>(null);

  // Chat State
  //const { messages, input, handleInputChange, handleSubmit } = useChat({});

  // API Call Inputs
  const [echoMessage, setEchoMessage] = useState('Hello MCP!');
  const [stateCode, setStateCode] = useState('');
  const [cityName, setCityName] = useState('');
  const [echoResult, setEchoResult] = useState('');
  const [alerts, setAlerts] = useState('');

  useEffect(() => {
    fetch('/api/mcp/profile')
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Execute API Calls
  const executeToolCall = async (toolName: string, input: Record<string, any>) => {
    setLoading(true);
    const response = await fetch('/api/mcp/calltool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolName, input }),
    });

    const result = await response.json();
    setEchoResult(result.content?.[0]?.text || 'No response');
    setLoading(false);
  };
  // Execute API Calls
  const executeHealthCheck = async () => {
    setLoading(true);
    const response = await fetch('/api/mcp/health', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },      
    });

    const result = await response.json();
    setAlerts(result.health || 'No response');
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok) throw new Error("Failed to fetch response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage.role === "assistant") {
            return [...prev.slice(0, -1), { role: "assistant", content: result }];
          }
          return [...prev, { role: "assistant", content: result }];
        });
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-white dark:from-sky-900 dark:to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <CloudSun className="h-20 w-20 text-sky-500 dark:text-sky-400 mb-8" />
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-6">MCP Control Panel</h1>

          {/* MCP Server Tools - Collapsible Section */}
          <div className="w-full max-w-2xl p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-md">
            <button
              onClick={() => setToolsVisible(!toolsVisible)}
              className="flex items-center justify-between w-full p-3 text-left font-semibold text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 rounded-md"
            >
              MCP Server Tools
              {toolsVisible ? <ChevronUp /> : <ChevronDown />}
            </button>

            {toolsVisible && (
              <div className="mt-4">
                <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
                  {data?.tools.tools.map((tool) => (
                    <li key={tool.name}>
                      <strong>{tool.name}</strong>
                      <pre className="bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(tool.inputSchema, null, 2)}
                      </pre>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Tool Execution Forms */}
          <div className="mt-6 w-full max-w-2xl">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Execute Tools</h2>

            <div className="space-y-6">
              {/* Translate Tool */}
              <div className="p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Translate a Query to Machine Language</h3>
                <input
                  type="text"
                  value={echoMessage}
                  onChange={(e) => setEchoMessage(e.target.value)}
                  className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700"
                  placeholder="Enter message..."
                />
                <button
                  onClick={() => executeToolCall('translate', {text: echoMessage})}
                  className="mt-3 w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  disabled={loading}
                >
                  {loading ? 'Running...' : 'Run Translate'}
                </button>
                {echoResult && <p className="mt-3 p-3 bg-gray-200 dark:bg-gray-700 rounded">{echoResult}</p>}
              </div>

              {/* Health */}
              <div className="p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Health Check</h3>
                
                <button
                  onClick={() => executeHealthCheck()}
                  className="mt-3 w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  disabled={loading}
                >
                  {loading ? 'Running...' : 'Check Health'}
                </button>
                {alerts && <p className="mt-3 p-3 bg-gray-200 dark:bg-gray-700 rounded">{JSON.stringify(alerts)}</p>}
              </div>

             
            </div>
          </div>
          {/* CHAT WIDGET */}
          <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">MCP Chat Demo</h1>
        
        {/* Chat Display */}
        <div className="h-96 overflow-y-auto border border-gray-200 rounded-md p-4 mb-4 bg-gray-50">
          {messages.length === 0 ? (
            <p className="text-gray-500">Ask me anything!</p>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`mb-2 p-2 rounded-md ${
                  msg.role === "user"
                    ? "bg-blue-100 text-blue-800 ml-auto max-w-[80%]"
                    : "bg-gray-200 text-gray-800 mr-auto max-w-[80%]"
                }`}
              >
                {msg.content}
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
            className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
