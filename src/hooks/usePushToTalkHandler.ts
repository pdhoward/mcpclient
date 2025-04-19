/**
 * Hook to manage Push-to-Talk functionality
 */
import { useState } from 'react';

interface UsePTTHandlerProps {
  sessionStatus: string;
  dataChannel: RTCDataChannel | null;
  sendClientEvent: (eventObj: any, eventNameSuffix?: string) => void;
  cancelAssistantSpeech: (transcriptItems: any[]) => void;
}

export function usePTTHandler({
  sessionStatus,
  dataChannel,
  sendClientEvent,
  cancelAssistantSpeech
}: UsePTTHandlerProps) {
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState<boolean>(false);

  const handleTalkButtonDown = (transcriptItems: any[]) => {
    if (sessionStatus !== "CONNECTED" || dataChannel?.readyState !== "open")
      return;
    cancelAssistantSpeech(transcriptItems);

    setIsPTTUserSpeaking(true);
    sendClientEvent({ type: "input_audio_buffer.clear" }, "clear PTT buffer");
  };

  const handleTalkButtonUp = () => {
    if (
      sessionStatus !== "CONNECTED" ||
      dataChannel?.readyState !== "open" ||
      !isPTTUserSpeaking
    )
      return;

    setIsPTTUserSpeaking(false);
    sendClientEvent({ type: "input_audio_buffer.commit" }, "commit PTT");
    sendClientEvent({ type: "response.create" }, "trigger response PTT");
  };

  return {
    isPTTUserSpeaking,
    handleTalkButtonDown,
    handleTalkButtonUp
  };
}