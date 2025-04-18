"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button"; // Shadcn/UI Button
import dynamic from "next/dynamic";
import { Play } from "lucide-react"; // Lucide-React Play icon

// Dynamically import VoiceAgent with SSR disabled
const VoiceAgent = dynamic(() => import("./VoiceAgent"), { ssr: false });

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

interface PersonaNavbarProps {
  onClose: () => void;
}

const PersonaNavbar = ({ onClose }: PersonaNavbarProps) => {
  const [selectedPersona, setSelectedPersona] = useState(personas[0]);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  const handlePersonaClick = (persona: typeof personas[0]) => {
    setSelectedPersona(persona);
    setIsVoiceActive(true);
  };

  return (
    <div className="fixed bottom-24 right-5 z-[1000] bg-white rounded-2xl shadow-lg p-4 flex flex-col gap-2">
      <div className="flex gap-2 flex-wrap">
        {personas.map((persona) => (
          <Button
            key={persona.name}
            onClick={() => handlePersonaClick(persona)}
            variant="ghost"
            className={`flex items-center gap-2 ${
              selectedPersona.name === persona.name ? "bg-gray-100" : ""
            }`}
          >
            <Image
              src={persona.avatar}
              alt={persona.name}
              width={24}
              height={24}
              className="rounded-full"
            />
            <span className="text-sm">{persona.name}</span>
          </Button>
        ))}
      </div>
      {isVoiceActive && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsVoiceActive(true)}
            className="w-8 h-8"
          >
            <Play className="w-4 h-4" />
          </Button>
          <span className="text-sm">Talking to {selectedPersona.name}</span>
        </div>
      )}
      <VoiceAgent persona={selectedPersona} isActive={isVoiceActive} />
      <Button
        onClick={onClose}
        variant="ghost"
        className="self-end text-sm"
      >
        Close
      </Button>
    </div>
  );
};

export default PersonaNavbar;