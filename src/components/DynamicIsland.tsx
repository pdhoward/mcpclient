import { useEffect, useCallback} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { X } from "lucide-react";
import { useAgentManager } from "@/contexts/AgentManager";
import { Agent } from "@/lib/types";

interface DynamicIslandProps {
  isOpen: boolean;
  onClose: () => void;
  onAgentSelect: (agent: Agent) => void;
}

export default function DynamicIsland({ isOpen, onClose, onAgentSelect }: DynamicIslandProps) {  
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
    onClose();
  }, [onClose]);

  // Handle agent selection
  const handleAgentSelect = (agent: Agent) => {
    onAgentSelect(agent); // set activeAgent and isAgentSelected
    onClose(); 
  };
 

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 100, height: 28, borderRadius: 28, opacity: 0 }}
          animate={{
            width: 860,
            height: 144,
            borderRadius: 32,
            opacity: 1,
          }}
          exit={{ width: 100, height: 28, borderRadius: 28, opacity: 0 }}
          transition={{ type: "spring", bounce: 0.3 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 bg-black rounded-[32px] shadow-lg flex items-center justify-center overflow-hidden z-50"
        >
       
            <motion.div
              initial={{ opacity: 0, filter: "blur(4px)", y: -5 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              exit={{ opacity: 0, filter: "blur(4px)", y: 5 }}
              className="flex gap-4 p-4 w-full justify-center items-center" // Reduced gap from gap-8 to gap-4
            >
              {agents.length === 0 ? (
              <p className="text-neutral-400">No agents available</p>
            ) : (
              agents.map((agent) => (
                <Button
                  key={agent.id}
                  onClick={() => handleAgentSelect(agent)}
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
              ))
            )}
              <Button
                onClick={handleClose}
                variant="ghost"
                size="sm"
                className="text-red-600 font-bold" // Made 'X' red and bold
              >
                <X className="w-6 h-6" /> {/* Increased size for visibility */}
              </Button>
            </motion.div>   
        
        </motion.div>
      )}
    </AnimatePresence>
  );
}