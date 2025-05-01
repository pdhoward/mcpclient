import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Play, X } from "lucide-react";
import MetaAgent from "@/gallery/agents/metaagent";
import { useAgentManager } from "@/contexts/AgentManager";

interface DynamicIslandProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DynamicIsland({ isOpen, onClose }: DynamicIslandProps) {
  const [state, setState] = useState(0); // 0: Personas, 1: Voice
  const { agents, activeAgent, setActiveAgent } = useAgentManager();

  const placeholderAvatar = "https://res.cloudinary.com/stratmachine/image/upload/v1654369119/marketweb/ai_xs4tjr.png";

  // Map personas to voices
  const voiceMap: Record<string, string> = {
    StrategicMachines: "verse",
    CypressResorts: "alloy",
    Thalia: "coral",
    Odysseus: "echo",
    Arcas: "ember",
    Andromeda: "ash",
  };

  // Dimensions for the island states
  const dimensions = [
    { w: 860, h: 144, r: 32 }, // Personas
    { w: 480, h: 400, r: 32 }, // Voice (increased height for MetaAgent dashboard)
  ];

  // Handle closing the island
  const handleClose = useCallback(() => {
    setState(0);
    onClose();
  }, [onClose]);

  // Handle persona selection
  const handlePersonaSelect = useCallback(
    (agent: typeof agents[0]) => {
      console.log(`----------agent selected---------`);
      console.log(agent);
      setActiveAgent(agent);
      setState(1);
    },
    [setActiveAgent]
  );

  // Set default agent on mount
  useEffect(() => {
    if (agents.length > 0 && !activeAgent) {
      setActiveAgent(agents[0]);
    }
  }, [agents, activeAgent, setActiveAgent]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 100, height: 28, borderRadius: 28, opacity: 0 }}
          animate={{
            width: dimensions[state].w,
            height: dimensions[state].h,
            borderRadius: dimensions[state].r,
            opacity: 1,
          }}
          exit={{ width: 100, height: 28, borderRadius: 28, opacity: 0 }}
          transition={{ type: "spring", bounce: 0.3 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 bg-black rounded-[32px] shadow-lg flex items-center justify-center overflow-hidden z-50"
        >
          {state === 0 && (
            <motion.div
              initial={{ opacity: 0, filter: "blur(4px)", y: -5 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              exit={{ opacity: 0, filter: "blur(4px)", y: 5 }}
              className="flex gap-4 p-4 w-full justify-center items-center" // Reduced gap from gap-8 to gap-4
            >
              {agents.map((agent) => (
                <Button
                  key={agent.id}
                  onClick={() => handlePersonaSelect(agent)}
                  variant="ghost"
                  className="flex flex-col items-center gap-2 text-neutral-100 relative group hover:bg-transparent hover:text-red-600"
                  title=""
                >
                  <Image
                    src={agent.avatar || placeholderAvatar}
                    alt={agent.name}
                    width={48}
                    height={48}
                  />
                  <span className="text-sm">{agent.name}</span>
                  <span className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded py-1 px-2">
                    Activate
                  </span>
                </Button>
              ))}
              <Button
                onClick={handleClose}
                variant="ghost"
                size="sm"
                className="text-red-600 font-bold" // Made 'X' red and bold
              >
                <X className="w-6 h-6" /> {/* Increased size for visibility */}
              </Button>
            </motion.div>
          )}
          {state === 1 && activeAgent && (
            <motion.div
              initial={{ opacity: 0, filter: "blur(4px)", y: -5 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              exit={{ opacity: 0, filter: "blur(4px)", y: 5 }}
              className="flex flex-col items-center p-4 w-full max-h-[400px] overflow-y-auto"
            >
              <div className="flex items-center gap-2 mb-4 w-full justify-between">
                <div className="flex items-center gap-2">
                  <Image
                    src={activeAgent.avatar || "/placeholder.png"}
                    alt={activeAgent.name}
                    width={36}
                    height={36}
                    className="rounded-full"
                  />
                  <span className="text-sm text-neutral-100">
                    Talking to {activeAgent.name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setState(0)}
                  className="text-neutral-100"
                >
                  <Play className="w-4 h-4 rotate-180" />
                </Button>
              </div>
              <MetaAgent
                activeAgent={activeAgent}
                setActiveAgent={setActiveAgent}
                voice={voiceMap[activeAgent.name]}
              />
              <Button
                onClick={handleClose}
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 text-red-600 font-bold" // Made 'X' red and bold
              >
                <X className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}