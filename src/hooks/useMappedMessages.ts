import { useTranscript } from "@/contexts/TranscriptContext";
import { useEvent } from "@/contexts/EventContext";
import { Conversation, Message, LoggedEvent, TranscriptItem } from "@/lib/types";

////////////////////////////////////////////////////////////////////////////////
// ✅ Function to map transcriptItems to conversation & loggedEvents to logs //
//          TranscriptItems and LoggedEvents Record More data from           //
//       RealTime event messages and logs than required for agents - so this /
//             this mapper filters and reorganizes data for AI Agents       //
/////////////////////////////////////////////////////////////////////////////

export function useMappedMessages() {
  const { transcriptItems } = useTranscript();
  const { loggedEvents } = useEvent();

  // Map TranscriptItem to Conversation
  const conversation: Conversation = transcriptItems
    .filter((item) => !item.isHidden)
    .map((item): Message => ({
      id: item.itemId,
      role: item.role ?? "system",
      type: item.type === "MESSAGE" ? "message" : "breadcrumb",
      timestamp: item.createdAtMs,
      text: item.title || "No message provided",
      context: {
        id: item.role === "user" ? "user-001" : "agent-001",
        name: item.role === "user" ? "User" : "Agent",
        message: item.title || "No message provided",
      },
    }));

  // Map LoggedEvent to logs
  const logs: Message[] = loggedEvents.map((event): Message => ({
    id: event.id.toString(),
    role: event.direction === "client" ? "user" : "assistant",
    type: event.eventName,
    timestamp: event.timestamp,
    text: JSON.stringify(event.eventData, null, 2),
    context: {
      id: event.direction === "client" ? "user-001" : "agent-001",
      name: event.direction === "client" ? "User" : "Agent",
      message: JSON.stringify(event.eventData, null, 2),
    },
  }));

  return { logs, conversation };
}