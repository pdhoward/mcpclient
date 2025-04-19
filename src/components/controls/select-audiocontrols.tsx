"use client";

import React from "react";
import { SessionStatus } from "@/lib/types";
import { Mic, MicOff, Radio } from "lucide-react";
import clsx from "clsx";

interface AudioControlProps {
  sessionStatus: SessionStatus; 
  isPTTActive: boolean;
  setIsPTTActive: (val: boolean) => void;
  isPTTUserSpeaking: boolean;
  handleTalkButtonDown: () => void;
  handleTalkButtonUp: () => void;
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: (val: boolean) => void;
}

function AudioControls({
  sessionStatus, 
  isPTTActive,
  setIsPTTActive,
  isPTTUserSpeaking,
  handleTalkButtonDown,
  handleTalkButtonUp,  
  isAudioPlaybackEnabled,
  setIsAudioPlaybackEnabled,
}: AudioControlProps) {
  const isConnected = sessionStatus === "CONNECTED";

  return (
    <div className="flex flex-col gap-3"> 
      <button 
        onClick={() => setIsPTTActive(!isPTTActive)} 
        className={clsx(
          "p-2 rounded-full transition-colors duration-200",
          isPTTActive ? "bg-green-500 hover:bg-green-600" : "bg-gray-300 hover:bg-gray-400"
        )}
      >
        <Radio className="w-4 h-4 text-white" />
      </button>
      <button 
        onClick={() => setIsAudioPlaybackEnabled(!isAudioPlaybackEnabled)} 
        className={clsx(
          "p-2 rounded-full transition-colors duration-200",
          isAudioPlaybackEnabled ? "bg-green-500 hover:bg-green-600" : "bg-gray-300 hover:bg-gray-400"
        )}
      >
        {isAudioPlaybackEnabled ? 
          <Mic className="w-4 h-4 text-white" /> : 
          <MicOff className="w-4 h-4 text-white" />
        }
      </button>
    </div>
  );
}

export default AudioControls;