"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Play, X } from "lucide-react";
import VoiceAgent from "./VoiceAgent";

const personas = [
  {
    name: "Thalia",
    avatar: "https://www.datocms-assets.com/96965/1743435052-thalia.png",
  },
  {
    name: "Odysseus",
    avatar: "https://www.datocms-assets.com/96965/1743435516-odysseus.png",
  },
  {
    name: "Arcas",
    avatar: "https://www.datocms-assets.com/96965/1744230292-arcas.webp",
  },
  {
    name: "Andromeda",
    avatar: "https://www.datocms-assets.com/96965/1743434880-andromeda.png",
  },
];

interface DynamicIslandProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DynamicIsland({ isOpen, onClose }: DynamicIslandProps) {
  const [state, setState] = useState(0); // 0: Personas, 1: Voice
  const [selectedPersona, setSelectedPersona] = useState(personas[0]);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  // Dimensions for the island states
  const dimensions = [
    { w: 480, h: 144, r: 32 }, // Personas
    { w: 480, h: 200, r: 32 }, // Voice
  ];

  // Handle closing the island
  const handleClose = useCallback(() => {
    setIsVoiceActive(false);
    setState(0);
    onClose();
  }, [onClose]);

  // Handle persona selection
  const handlePersonaSelect = useCallback((persona: typeof personas[0]) => {
    setSelectedPersona(persona);
    setIsVoiceActive(false); // Stop previous voice agent
    setState(1);
  }, []);

  // Memoize onStop
  const handleVoiceStop = useCallback(() => {
    console.log("handleVoiceStop called");
    setIsVoiceActive(false);
  }, []);

  // Memoize persona to ensure stability
  const stablePersona = useMemo(() => selectedPersona, [selectedPersona]);

  // Activate voice when state changes to voice mode
  useEffect(() => {
    if (state === 1) {
      console.log("Setting isVoiceActive to true for state 1");
      setIsVoiceActive(true);
    }
  }, [state]);

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
              className="flex gap-8 p-4 w-full justify-center items-center"
            >
              {personas.map((persona) => (
                <Button
                  key={persona.name}
                  onClick={() => handlePersonaSelect(persona)}
                  variant="ghost"
                  className="flex flex-col items-center gap-2 text-neutral-100 relative group hover:bg-transparent hover:text-red-600"
                  title="" // Prevent browser tooltip
                 
                >
                  <Image
                    src={persona.avatar}
                    alt={persona.name}
                    width={48}
                    height={48}
                    
                  />
                  <span className="text-sm">{persona.name}</span>
                  <span className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded py-1 px-2">
                    Activate
                  </span>
                </Button>
              ))}
              <Button
                onClick={handleClose}
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 text-neutral-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
          {state === 1 && (
            <motion.div
              initial={{ opacity: 0, filter: "blur(4px)", y: -5 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              exit={{ opacity: 0, filter: "blur(4px)", y: 5 }}
              className="flex flex-col items-center p-4 w-full"
            >
              <div className="flex items-center gap-2 mb-4 w-full justify-between">
                <div className="flex items-center gap-2">
                  <Image
                    src={stablePersona.avatar}
                    alt={stablePersona.name}
                    width={36}
                    height={36}
                    className="rounded-full"
                  />
                  <span className="text-sm text-neutral-100">
                    Talking to {stablePersona.name}
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
              <VoiceAgent
                persona={stablePersona}
                isActive={isVoiceActive}
                onStop={handleVoiceStop}
              />
              <Button
                onClick={handleClose}
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 text-neutral-100"
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