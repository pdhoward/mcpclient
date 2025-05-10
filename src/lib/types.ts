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
  voice?: string;
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


export const StateMachineStepSchema = z
  .object({
    id: z.string(),
    description: z.string(),
    instructions: z.array(z.string()),
    examples: z.array(z.string()),
    transitions: z.array(
      z.object({
        next_step: z.string(),
        condition: z.string(),
      })
    ),
  })
  

// Subscription schema for pricing and terms
const SubscriptionSchema = z.object({
  price: z.number().nonnegative().describe("Price in USD (e.g., 10 for $10/month, 0.01 for $0.01/call)"),
  currency: z.string().default("USD").describe("Currency code (e.g., USD, EUR)"),
  terms: z.enum(["flat_rate", "usage_based", "freemium"]).describe("Pricing model"),
  interval: z
    .enum(["monthly", "yearly", "per_use"])
    .optional()
    .describe("Billing interval for flat_rate (e.g., monthly, yearly) or per_use for usage_based"),
  usageLimits: z
    .object({
      calls: z.number().nonnegative().optional().describe("Max API calls (e.g., 100 calls/month)"),
      minutes: z.number().nonnegative().optional().describe("Max voice minutes (e.g., 500 minutes/month)"),
    })
    .optional()
    .describe("Usage limits for freemium or usage_based models"),
  trialPeriod: z
    .number()
    .nonnegative()
    .optional()
    .describe("Trial period in days (e.g., 14 for 14-day free trial)"),
});

// Security schema for API authentication
const SecuritySchemeSchema = z.object({
  type: z.enum(["oauth2", "api_key"]).describe("Authentication type"),
  location: z.enum(["header", "query"]).describe("Where the credential is sent (e.g., header, query)"),
  name: z.string().describe("Header or query parameter name (e.g., Authorization)"),
  prefix: z.string().optional().describe("Prefix for the credential (e.g., Bearer)"),
  client_id: z.string().optional().describe("OAuth2 client ID"),
  client_secret: z.string().optional().describe("OAuth2 client secret"),
  scope: z.string().optional().describe("OAuth2 scopes"),
  authorize_url: z.string().url().optional().describe("OAuth2 authorization URL"),
  access_token_url: z.string().url().optional().describe("OAuth2 access token URL"),
  refresh_token_url: z.string().url().optional().describe("OAuth2 refresh token URL"),
});

export const AgentProfileSchema = z.object({
  id: z.string().describe("Unique identifier for the agent (e.g., modifications)"),
  name: z.string().describe("Assigned name for UI (e.g., Modification)"),
  displayName: z.string().describe("Human-readable name for UI (e.g., Modification Agent)"),
  provider: z.string().describe("Entity providing the agent (e.g., YourCompany)"),
  version: z.string().describe("Agent version (e.g., 1.0.0)"),
  description: z.string().describe("Detailed description of the agent’s purpose and capabilities"),
  logo: z.string().url().describe("URL to the business logo or icon"),
  avatar: z.string().url().describe("URL to the agent’s avatar image"),
  categories: z.array(z.string()).describe("Tags for classification (e.g., Customer Service, Voice Agent)"),
  visibility: z.enum(["public", "private", "tenant"]).describe("Access level (public, private, or tenant-specific)"),
  active: z.boolean().describe("Whether the agent is active"), 
  downstreamAgentIds: z.array(z.string()).describe("IDs of agents that can be routed to after this agent"), 
  configuration: z
    .object({
      specialities: z.array(z.string()).describe("Agent specializations (e.g., voice, text streaming)"),
      capabilities: z.array(z.string()).describe("Agent capabilities (e.g., full text transcriptions)"),
      api: z.string().describe("path/to/ui for the active agent. May be a chat widget, form, chart etc"),
    })
    .describe("Agent configuration details"),
  securitySchemes: z
    .record(SecuritySchemeSchema)
    .optional()
    .describe("Authentication schemes for OpenAI Realtime API or other integrations"),
  subscription: SubscriptionSchema.optional().describe("Pricing and terms for agent access"),
  voice: z.string().optional().describe("Voice prop for the agent or service"),
  component: z.string().describe("Path to the UI component that is the principal interface - chat widget, form, report or audio etc (e.g., agents/components/placeholder-form)"),
  createdAt: z.date().describe("Creation timestamp"),
  updatedAt: z.date().describe("Last update timestamp"),
});


// Export types
export type AgentProfile = z.infer<typeof AgentProfileSchema>;
export type AgentPrompt = z.infer<typeof AgentPromptSchema>
export type StateMachineStep = z.infer<typeof StateMachineStepSchema>






