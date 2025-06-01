/**
 * Hook to manage message handling and conversation flow
 */
import { useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useTranscript } from '@/contexts/TranscriptContext';
import { useEvent } from '@/contexts/EventContext';

interface UseMessageHandlerProps {
  dcRef: React.RefObject<RTCDataChannel | null>;
  sessionStatus: string;
}

export function useMessageHandler({ dcRef, sessionStatus }: UseMessageHandlerProps) {
  const { addTranscriptMessage } = useTranscript();
  const { logClientEvent } = useEvent();

  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    console.log(`-----debug in useMessageHandler -----`)
    console.log('Send Client Event Triggered:', JSON.stringify(eventObj, null, 2), eventNameSuffix);
    if (dcRef.current && dcRef.current.readyState === "open") {     
      logClientEvent(eventObj, eventNameSuffix);
      dcRef.current.send(JSON.stringify(eventObj));
    } else {
      logClientEvent(
        { attemptedEvent: eventObj.type },
        "error.data_channel_not_open"
      );
      // Using a more descriptive error message
      const errorMessage = "Failed to send message - data channel is not available or not open";
      console.warn(errorMessage, eventObj);
    }
  };

  const sendSimulatedUserMessage = (text: string) => {
    const id = uuidv4().slice(0, 32);
    addTranscriptMessage(id, "user", text, true);

    sendClientEvent(
      {
        type: "conversation.item.create",
        item: {
          id,
          type: "message",
          role: "user",
          content: [{ type: "input_text", text }],
        },
      },
      "(simulated user text message)"
    );
    sendClientEvent(
      { type: "response.create" },
      "(trigger response after simulated user text message)"
    );
  };

  const cancelAssistantSpeech = async (transcriptItems: any[]) => {
    const mostRecentAssistantMessage = [...transcriptItems]
      .reverse()
      .find((item) => item.role === "assistant");

    if (!mostRecentAssistantMessage) {
      console.warn("can't cancel, no recent assistant message found");
      return;
    }
    if (mostRecentAssistantMessage.status === "DONE") {
      console.log("No truncation needed, message is DONE");
      return;
    }

    sendClientEvent({
      type: "conversation.item.truncate",
      item_id: mostRecentAssistantMessage?.itemId,
      content_index: 0,
      audio_end_ms: Date.now() - mostRecentAssistantMessage.createdAtMs,
    });

    sendClientEvent(
      { type: "response.cancel" },
      "(cancel due to user interruption)"
    );
  };

  const handleSendTextMessage = (userText: string, transcriptItems: any[]) => {   
    if (!userText.trim()) return;
    cancelAssistantSpeech(transcriptItems);
    sendClientEvent(
      {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: userText.trim() }],
        },
      },
      "(send user text message)"
    );

    sendClientEvent({ type: "response.create" }, "trigger response");
  };

  return {
    sendClientEvent,
    sendSimulatedUserMessage,
    cancelAssistantSpeech,
    handleSendTextMessage
  };
}