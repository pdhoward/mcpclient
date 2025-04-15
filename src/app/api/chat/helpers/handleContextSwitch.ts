// Helper: Check for context switch or execution request

import {Message, Tool} from "@/lib/types"

export async function handleContextSwitch(
    lastMessage: Message,
    tools: Tool[],
    toolName: string | undefined,
    collectedInputs: Record<string, any>,
    finished: boolean,
    missingParams: string[]
  ): Promise<{
    response: Message | null;
    newToolName: string | undefined;
    newCollectedInputs: Record<string, any>;
    newFinished: boolean;
  }> {
    if (!toolName) {
      return {
        response: null,
        newToolName: undefined,
        newCollectedInputs: collectedInputs,
        newFinished: finished,
      };
    }
  
    const userMessage = lastMessage.content.trim().toLowerCase();
  
    // Check for execution request
    const executionKeywords = ["run it", "execute", "go ahead", "do it", "submit"];
    const isExecutionRequest = executionKeywords.some((keyword) =>
      userMessage.includes(keyword)
    );
  
    if (isExecutionRequest && missingParams.length === 0) {
      const executeResponse: Message = {
        role: "assistant",
        content: `Executing ${toolName} with params: ${JSON.stringify(collectedInputs)}`,
        timestamp: Date.now(),
        annotations: [
          {
            type: "tool-input-state",
            toolName: undefined,
            collectedInputs: {},
            finished: false,
            contextStatePending: false,
            toolPending: undefined,
          },
        ],
      };
      return {
        response: executeResponse,
        newToolName: undefined,
        newCollectedInputs: {},
        newFinished: false,
      };
    }
  
    // Check for potential context switch by looking for references to other tools
    let potentialNewTool: string | null = null;
    for (const tool of tools) {
      if (tool.name === toolName) continue; // Skip the current tool
      const toolNameLower = tool.name.toLowerCase();
      const descriptionLower = tool.description?.toLowerCase() || "";
      const toolKeywords = descriptionLower
        .split(" ")
        .filter((word) => word.length > 3);
      if (
        userMessage.includes(toolNameLower) ||
        toolKeywords.some((keyword) => userMessage.includes(keyword))
      ) {
        potentialNewTool = tool.name;
        break;
      }
    }
  
    if (potentialNewTool) {
      const confirmResponse: Message = {
        role: "assistant",
        content: `It looks like you might want to switch to ${potentialNewTool}. Do you want to proceed? (Say 'yes' to switch or 'no' to continue with ${toolName})`,
        timestamp: Date.now(),
        annotations: [
          {
            type: "tool-input-state",
            toolName,
            collectedInputs,
            finished,
            contextStatePending: true,
            toolPending: potentialNewTool,
          },
        ],
      };
      return {
        response: confirmResponse,
        newToolName: toolName,
        newCollectedInputs: collectedInputs,
        newFinished: finished,
      };
    }
  
    // No context switch or execution request; assume continuation
    return {
      response: null,
      newToolName: toolName,
      newCollectedInputs: collectedInputs,
      newFinished: missingParams.length === 0,
    };
  }