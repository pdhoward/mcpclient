/**
 * Hook to manage agent session configuration and updates
 */
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
      "useAgentSession trigger > clear audio buffer on session update"
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

    console.log(`---------debug useAgentSession hook -----`)
    console.log('Session instructions:', instructions);
    console.log('Tools:', tools);

    ///////////////////////////////////////////////
    ////  sending an event update to OpenAI    ///
    /////////////////////////////////////////////

    const sessionUpdateEvent = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        model: "gpt-4o-realtime-preview",
        instructions,
        voice: "coral",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: turnDetection,
        tools,
        tool_choice: "auto", // Force tool use with "required"
        temperature: 0.8,
        max_response_output_tokens: "inf"
      },
    };

    console.log('Sending session.update event:', JSON.stringify(sessionUpdateEvent, null, 2));

    sendClientEvent(sessionUpdateEvent);

    if (shouldTriggerResponse) {
      sendSimulatedUserMessage("hi");
    }
  };

  return {
    updateSession
  };
}