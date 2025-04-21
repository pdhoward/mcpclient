import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { Message, MessageStatus } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/////////////////////////////////////////////////////
// set of function to filter and display messages //
//    in a real time voice application           //
//////////////////////////////////////////////////

export function getMessageStatus(msg: Message): MessageStatus {
  if (msg.context && 'isComplete' in msg.context) {
    return msg.context.isComplete ? 'done' : 'processing';
  }
  return 'done';
}

export function getMessageText(msg: Message): string {
  return msg.context &&  'message' in msg.context ? msg.context.message : '';
}

export function isMessageFinal(msg: Message): boolean {
  if (msg.context && 'isComplete' in msg.context && typeof msg.context.isComplete === 'boolean') {
    return msg.context.isComplete;
  }
  return true;
}

/**
* Decide if a conversation item should be displayed or filtered out. 
* Optional, this is used to filter out empty or useless user messages
*/
export function shouldDisplayMessage(msg: Message): boolean {
  const { role } = msg;
  const text = getMessageText(msg).trim();
  const status = getMessageStatus(msg);
  const isFinal = isMessageFinal(msg);

  // Always display assistant messages
  if (role === "assistant") return true;

  // Always display messages with "processing" status
  if (status === "processing") return true;

  // Display user/system messages only if final and not empty
  return isFinal && text.length > 0;
}

