import { useTranscript } from "@/contexts/TranscriptContext";
import { Conversation, Message, LoggedEvent, TranscriptItem } from "@/lib/types";
import { useEvent } from "@/contexts/EventContext";

////////////////////////////////////////////////////////////////////////////////
// ✅ Function to map transcriptItems to conversation & loggedEvents to logs //
//          TranscriptItems and LoggedEvents Record More data from           //
//       RealTime event messages and logs than required for agents - so this /
//             this mapper filters and reorganizes data for AI Agents       //
/////////////////////////////////////////////////////////////////////////////
export function useMappedMessages() {
  const { transcriptItems } = useTranscript();
   const { loggedEvents, toggleExpand } = useEvent();

  // 🔹 Map `TranscriptItem` to `Conversation`
 const conversation: Conversation = transcriptItems
 .filter((item) => !item.isHidden) // Ignore hidden items
 .map((item): Message => {
   const role: "user" | "assistant" | "system" = item.role ?? "system";

   const messageContent = item.data?.message || item.title || "No message provided";
   const metadata = { ...item.data }; // Preserve metadata

   return {
     id: item.itemId,
     role,
     timestamp: new Date(item.createdAtMs),
     type: item.type === "MESSAGE" ? "message" : "breadcrumb", // ✅ Match `Message` schema   
     context:
       role === "user"
         ? ({
             message: messageContent,
           } )
         : ({
             name: "Agent",
             id: "agent-001",
             confidence: 1.0,
             message: messageContent,
             form: metadata,
             isComplete: item.status === "DONE",
           } )
   };
 });
 // 🔹 Map `LoggedEvent` to `logs`
 const logs: Message[] = loggedEvents.map((event) => ({
  id: event.id.toString(),
  role: event.direction === "client" ? "user" : "assistant",
  type: event.eventName,
  timestamp: new Date(event.timestamp),
  text: JSON.stringify(event.eventData, null, 2), // ✅ Convert eventData to string
  isFinal: true, // ✅ Assume logs are final
  context: { message: "Logged Event", metadata: event.eventData }, // ✅ Ensure `context` exists
}));

  return { logs, conversation };
}