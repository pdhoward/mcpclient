
import { Message } from "@/lib/types";

// Helper function to determine user response type
function determineResponseType(userResponse: string): string {
const confirmWords = ["yes", "y", "sure", "okay", "confirm"];
const cancelWords = ["no", "n", "cancel", "nevermind", "stop"];

if (confirmWords.some(word => userResponse.includes(word))) {
    return "confirm";
}
if (cancelWords.some(word => userResponse.includes(word))) {
    return "cancel";
}
return "unclear";
}


export async function handlePendingContextSwitch(
    lastMessage: Message,
    toolName: string | undefined,
    toolPending: string | undefined,
    collectedInputs: Record<string, any>,
    finished: boolean,
    missingParams: string[]
  ): Promise<{
    response: Message;
    newToolName: string | undefined;
    newCollectedInputs: Record<string, any>;
    newFinished: boolean;
  }> {
    // Default response structure
    const defaultResponse = {
      newToolName: toolName,
      newCollectedInputs: collectedInputs,
      newFinished: finished,
    };
  
    // Validate initial state
    if (!toolName || !toolPending) {
      return {
        ...defaultResponse,
        response: {
          role: "assistant",
          content: "Error: Invalid state for context switch confirmation.",
          timestamp: Date.now(),
          annotations: [{
            type: "tool-input-state",
            toolName: undefined,
            collectedInputs,
            finished,
            contextStatePending: false,
            toolPending: undefined,
          }],
        },
      };
    }
  
    const userResponse = lastMessage.content.trim().toLowerCase();
    const responseType = determineResponseType(userResponse);
  
    switch (responseType) {
      case "confirm":
        return {
          response: {
            role: "assistant",
            content: `Switching to ${toolPending}. Let's start with the required parameters. ${
              missingParams.length > 0 ? `Please provide ${missingParams[0]}.` : "No parameters needed."
            }`,
            timestamp: Date.now(),
            annotations: [{
              type: "tool-input-state",
              toolName: toolPending,
              collectedInputs: {},
              finished: false,
              contextStatePending: false,
              toolPending: undefined,
            }],
          },
          newToolName: toolPending,
          newCollectedInputs: {},
          newFinished: false,
        };
  
      case "cancel":
        return {
          ...defaultResponse,
          response: {
            role: "assistant",
            content: `Okay, sticking with ${toolName}. ${
              missingParams.length > 0 ? `Please provide ${missingParams[0]}.` : "All parameters collected. Ready to execute."
            }`,
            timestamp: Date.now(),
            annotations: [{
              type: "tool-input-state",
              toolName,
              collectedInputs,
              finished,
              contextStatePending: false,
              toolPending: undefined,
            }],
          },
        };
  
      default:
        return {
          ...defaultResponse,
          response: {
            role: "assistant",
            content: `I'm not sure if you want to switch tasks. Please say 'yes' to switch to ${toolPending} or 'no' to continue with ${toolName}.`,
            timestamp: Date.now(),
            annotations: [{
              type: "tool-input-state",
              toolName,
              collectedInputs,
              finished,
              contextStatePending: true,
              toolPending,
            }],
          },
        };
    }
  }
  
