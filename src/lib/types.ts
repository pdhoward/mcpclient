// types.ts

import {z} from 'zod'

// Message needs to be rationalized between using content (for MCP)
export interface Message {
    id: string;    
    role: "user" | "assistant" | "system";
    content?: string | undefined;
    context?: UserMessageContext | AgentResponseContext;
    annotations?: Array<{
      type: string;
      toolName?: string;
      collectedInputs?: Record<string, any>;
      finished?: boolean;
      contextStatePending?: boolean,
      toolPending?: string,
    }>;
    timestamp: number; // Unix timestamp in milliseconds
    tokens?: number
    response?: {
      usage: {
        total_tokens: number
        input_tokens: number
        output_tokens: number
      }
    }
  }

  export type MessageStatus = "speaking" | "processing" | "done";

   // Structure for User Input
   export interface UserMessageContext {
    message: string; // Stores the actual text input from the user
  }

  // Structure for Agent Response (Flexible for any agent)
  export interface AgentResponseContext {
    name: string; // Agent's name
    id: string; // Agent's ID
    confidence: number;
    message: string; // The agent’s response
    form?: Record<string, any>; // Optional for agents that return structured data
    isComplete?: boolean;
  }

  // Define Conversation as Simply an Array of Messages
  export type Conversation = Message[];

  export enum HttpMethod {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    DELETE = "DELETE",
    PATCH = "PATCH",
    OPTIONS = "OPTIONS",
    HEAD = "HEAD",
  }

  
// MCP Server and Client Types
export interface ToolInputState {
    type: "tool-input-state";
    toolName: string | undefined;
    collectedInputs: Record<string, any>;
    finished: boolean;
    contextStatePending?: boolean;
    toolPending?: string | undefined;
  }

  type JSONSchemaType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "object"
  | "array";

export interface JSONSchema {
  type: JSONSchemaType;
  description?: string;
  enum?: string[]; // for fixed choices
  pattern?: string; // for string regex patterns
  properties?: Record<string, JSONSchema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JSONSchema; // for arrays
}

// Tool definition
export interface Tool {
  type: "function"; // assume OpenAI-compatible functions
  name: string;
  description?: string;

  // ✅ This is used internally for your app’s own validation/UI/etc
  inputSchema?: JSONSchema & { type: "object"; properties: Record<string, JSONSchema> };

  // ✅ This is passed to OpenAI or similar APIs
  parameters?: JSONSchema & { type: "object"; properties: Record<string, JSONSchema> };
}

export interface ToolSchema {
  type: "object";
  properties?: Record<string, { type: string; description?: string }>;
  required?: string[];
}

export interface State {
  toolName: string | undefined;
  toolSchema: ToolSchema | null;
  collectedInputs: Record<string, any>;
  finished: boolean;
  contextStatePending: boolean;
  toolPending: string | undefined;
}

export interface ToolsAndClient {
  tools:  Array<{ name: string; schema: ToolSchema }>;
  client: any; // Replace with actual client type if known
}


// Main Agent type definition
export interface Agent {
  id: string;
  name: string;
  displayName: string | null;
  provider: string; 
  description: string; 
  logo: string;
  avatar: string;
  isActive: boolean;
  categories: string[];
  downstreamAgentIds: string[];
  configuration: {
    specialities: string[];
    capabilities: string[];
    api: string;
  };
  visibility: string;
  component: string;
  createdAt: Date;
  updatedAt: Date;
}
  
  export type AgentContextType = {
    activeAgent: string | null;
    setActiveAgent: (agent: string | null) => void;
    agents: Agent[];
  };

  // Base props that all agent components will receive
  export interface AgentComponentProps {
    activeAgent: Agent;
    setActiveAgent: (agent: Agent | null) => void;
    // Add any other common props here
  }

  export type ChatMessage = {
    type: "bot" | "user";
    content: string;
  };

  export interface TranscriptItem {
    itemId: string;
    type: "MESSAGE" | "BREADCRUMB";
    role?: "user" | "assistant";
    title?: string;
    data?: Record<string, any>;
    expanded: boolean;
    timestamp: string;
    createdAtMs: number;
    status: "IN_PROGRESS" | "DONE";
    isHidden: boolean;
  }

  
export interface LoggedEvent {
id: number;
direction: "client" | "server";
expanded: boolean;
timestamp: string;
eventName: string;
eventData: Record<string, any>; // can have arbitrary objects logged
}

export type SessionStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED";

export interface AgentConfig {
  name: string;
  publicDescription: string; // gives context to agent transfer tool
  instructions: string;
  tools: Tool[];
  toolLogic?: Record<
    string,
    (args: any, transcriptLogsFiltered: TranscriptItem[]) => Promise<any> | any
  >;
  downstreamAgents?: AgentConfig[] | { name: string; publicDescription: string }[];
}


export interface TranscriptItem {
  itemId: string;
  type: "MESSAGE" | "BREADCRUMB";
  role?: "user" | "assistant";
  title?: string;
  data?: Record<string, any>;
  expanded: boolean;
  timestamp: string;
  createdAtMs: number;
  status: "IN_PROGRESS" | "DONE";
  isHidden: boolean;
}


export interface LoggedEvent {
id: number;
direction: "client" | "server";
expanded: boolean;
timestamp: string;
eventName: string;
eventData: Record<string, any>; // can have arbitrary objects logged
}


export interface ToolParameterProperty {
type: string;
description?: string;
enum?: string[];
pattern?: string;
properties?: Record<string, ToolParameterProperty>;
required?: string[];
additionalProperties?: boolean;
items?: ToolParameterProperty;
}

export interface ToolParameters {
type: string;
properties: Record<string, ToolParameterProperty>;
required?: string[];
additionalProperties?: boolean;
}

export interface AgentConfig {
name: string;
publicDescription: string; // gives context to agent transfer tool
instructions: string;
tools: Tool[];
toolLogic?: Record<
string,
(args: any, transcriptLogsFiltered: TranscriptItem[]) => Promise<any> | any
>;
downstreamAgents?: AgentConfig[] | { name: string; publicDescription: string }[];
}

export type AllAgentConfigsType = Record<string, AgentConfig[]>;

export const AgentPromptSchema = z.object({
  agentId: z.string(),
  name: z.string(),
  publicDescription: z.string(),
  instructions: z.string(),  
  versionTimestamp: z.string().datetime(),
  versionId: z.string().optional(), 
});


// Export types
export type AgentPrompt = z.infer<typeof AgentPromptSchema>




