"use client"
import { createContext, useContext, useState, useEffect, } from "react";

interface MCPApp {
    id: string;
    name: string;
    description: string;
    endpoint: string;
  }
  
  interface OrchestratorContextType {
    apps: MCPApp[];
    executeApp: (appName: string, toolName: string, args: Record<string, any>) => Promise<any>;
  }
  

const OrchestratorContext = createContext<OrchestratorContextType | null>(null);

export const OrchestratorProvider = ({ children }: React.PropsWithChildren) => {
  const [apps, setApps] = useState<MCPApp[]>([]);

  useEffect(() => {
    async function fetchRegistry() {
      const res = await fetch('/api/mcp/registry');
      if (!res.ok) {
        console.error("Failed to fetch MCP registry");
        return;
      }
      const data = await res.json();
      setApps(data.apps);
    }
    fetchRegistry()
      
  }, []);

  const executeApp = async (appName: string, toolName: string, args: Record<string, any>) => {
    const app = apps.find(a => a.id === appName);
    if (!app) throw new Error(`MCP app ${appName} not found in registry`);

    const response = await fetch(app.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({appName, tool: toolName, ...args }),
    });

    if (!response.ok) {
      throw new Error(`Error executing ${toolName}: ${response.statusText}`);
    }

    return response.json();
  };

  return (
    <OrchestratorContext.Provider value={{ apps, executeApp }}>
      {children}
    </OrchestratorContext.Provider>
  );
}


export const useOrchestrator = () => {
    const context = useContext(OrchestratorContext);
    if (!context) throw new Error("Orchestrator context not initialized");
    return context;
}
  