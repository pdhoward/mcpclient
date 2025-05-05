import React, { useState, useEffect } from 'react';
import { useAgentManager } from '@/contexts/AgentManager';
import dynamic from "next/dynamic";
import { Agent, AgentComponentProps } from '@/lib/types';
import Loading from "@/components/Loading"
import { ChevronDown, BarChart4, FileText, LineChart, Menu, X, Workflow } from 'lucide-react';


type DynamicAgentComponent = React.ComponentType<AgentComponentProps>;

const errorSVG = `
<svg width="300" height="150" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="red" />
  <text x="50%" y="50%" fill="white" font-size="20" font-family="Arial" text-anchor="middle" dominant-baseline="middle">
    ⚠ Diagram Not Available ⚠
  </text>
</svg>
`;


export function ViewContainer() {
  // State for agent components (from your original code)
  const { activeAgent, setActiveAgent } = useAgentManager(); 
  const [AgentComponent, setAgentComponent] = useState<DynamicAgentComponent | null>(null);
    
  // Agent component loading logic 
   useEffect(() => {      
     if (activeAgent && !activeAgent.component) {
       throw Error(`${activeAgent.name} missing component`)
     }
     if (activeAgent && activeAgent.component) {      
       const loadAgentComponent = async () => {
         try {
           // Explicitly type the dynamic import         
           const DynamicComponent = dynamic<AgentComponentProps>(            
             () => import(`@/${activeAgent.configuration.api}`).then((mod) => mod.default),
             {
               // Optional: Add loading component
               loading: () => <div className="text-neutral-400">Loading agent component...</div>
             }
           );
           
           setAgentComponent(() => DynamicComponent);
         } catch (error) {
           console.error("Error loading component:", error);
           // Define a named fallback component
           const FallbackComponent: React.FC = () => (
             <div className="text-red-500">Failed to load component</div>
           );
           FallbackComponent.displayName = "FallbackComponent";
 
           setAgentComponent(() => FallbackComponent);
         }
       };
 
       loadAgentComponent();
     } else {
       setAgentComponent(null);
     }
   }, [activeAgent]);

  
  // Helper to format agent name (from your original code)
  const formatAgentName = (name: string) => {
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
    return formattedName.toLowerCase().includes("agent")
      ? formattedName
      : `${formattedName} Agent`;
  };  

  return (
    <main className="flex-1 overflow-y-auto bg-neutral-900">
      <div className="h-[40px] border-b border-neutral-800 px-6 flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-semibold text-neutral-200 truncate">
          {activeAgent ? formatAgentName(activeAgent.name) : "Agent Workbench"}
        </h2>        
      </div>
      
      <div className="p-6 flex-1 overflow-y-auto">
        {AgentComponent && activeAgent ? (
          <AgentComponent activeAgent={activeAgent} setActiveAgent={setActiveAgent} />
        ) : (
          <div className="flex items-center justify-center h-[calc(100vh-140px)]">
             <Loading />           
          </div>
        )}
      </div>
      
     
    </main>
  );
}