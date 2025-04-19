/**
 * Hook to manage agent session configuration and updates
 */
import { useEffect } from 'react';
import { AgentConfig } from '@/lib/types';

interface UseAgentSessionProps {
  selectedAgentName: string;
  selectedAgentConfigSet: AgentConfig[] | null;
  isPTTActive: boolean;
  sendClientEvent: (eventObj: any, eventNameSuffix?: string) => void;
  sendSimulatedUserMessage: (text: string) => void;
}

export function useAgentSession({
  selectedAgentName,
  selectedAgentConfigSet,
  isPTTActive,
  sendClientEvent,
  sendSimulatedUserMessage
}: UseAgentSessionProps) {
  const updateSession = (shouldTriggerResponse: boolean = false) => {
    sendClientEvent(
      { type: "input_audio_buffer.clear" },
      "clear audio buffer on session update"
    );

    const currentAgent = selectedAgentConfigSet?.find(
      (a) => a.name === selectedAgentName
    );

    const turnDetection = isPTTActive
      ? null
      : {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 200,
          create_response: true,
        };

    const instructions = currentAgent?.instructions || "";
    const tools = currentAgent?.tools || [];

    const sessionUpdateEvent = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions,
        voice: "coral",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: turnDetection,
        tools,
      },
    };

    sendClientEvent(sessionUpdateEvent);

    if (shouldTriggerResponse) {
      sendSimulatedUserMessage("hi");
    }
  };

  return {
    updateSession
  };
}