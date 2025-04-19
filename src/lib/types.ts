// types.ts

// Message needs to be rationalized between using content (for MCP)
export interface Message {
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
  
export interface Tool {
    name: string;
    description?: string;
    inputSchema: {
      type: "object";
      properties?: Record<string, any>;
      required?: string[];
    };
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
//////////////////////////////////////////////

// Base types for Agent relationships
export interface Tenant {
  id: string;
  // Add other tenant fields as needed
}

export interface AgentAction {
  id: string;
  // Add other action fields as needed
}

export interface AgentState {
  id: string;
  // Add other state fields as needed
}

export interface CompletedAction {
  id: string;
  // Add other completed action fields as needed
}

export interface AgentStack {
  id: string;
  // Add other stack fields as needed
}

export interface LogEvent {
  id: string;
  // Add other log event fields as needed
}


// Main Agent type definition
export interface Agent {
  id: string;
  name: string;
  description: string | null;
  tenantId: string;
  tenant?: Tenant;
  agentActions?: AgentAction[];
  agentStates?: AgentState[];
  completedActions?: CompletedAction[];
  agentStacks?: AgentStack[];
  logEvents?: LogEvent[];
  component?: string;
  form?: string;
  api?: string;
  isActive: boolean;
  configuration: Record<string, any> | null; // Represents JSON type
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



