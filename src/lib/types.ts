// types.ts
export interface Message {
    role: "user" | "assistant";
    content: string;
    annotations?: Array<{
      type: string;
      toolName?: string;
      collectedInputs?: Record<string, any>;
      finished?: boolean;
    }>;
    timestamp: number; // Unix timestamp in milliseconds
  }