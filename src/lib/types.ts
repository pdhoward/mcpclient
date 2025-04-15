// types.ts
export interface Message {
    role: "user" | "assistant";
    content: string;
    annotations?: Array<{
      type: string;
      toolName?: string;
      collectedInputs?: Record<string, any>;
      finished?: boolean;
      contextStatePending?: boolean,
      toolPending?: string,
    }>;
    timestamp: number; // Unix timestamp in milliseconds
  }
  

export interface ToolInputState {
    type: "tool-input-state";
    toolName: string | undefined;
    collectedInputs: Record<string, any>;
    finished: boolean;
    contextStatePending?: boolean;
    toolPending?: string | undefined;
  }
  
export interface Tool {
    name: string;
    description?: string;
    inputSchema: {
      type: "object";
      properties?: Record<string, any>;
      required?: string[];
    };
  }