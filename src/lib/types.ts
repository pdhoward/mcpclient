// types.ts

import {z} from 'zod'

// Message needs to be rationalized between using content (for MCP)
export interface Message {
    id: string;    
    role: "user" | "assistant" | "system";
    content?: string | undefined;
    context?: UserMessageContext | AgentResponseContext;
    type?: string;
    text?: string;
    isFinal?: boolean;
    annotations?: Array<{
      type: string;
      toolName?: string;
      collectedInputs?: Record<string, any>;
      finished?: boolean;
      contextStatePending?: boolean,
      toolPending?: string,
    }>;
    timestamp: number | null;  // Unix timestamp in milliseconds
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
tools: OpenAITool[];
toolLogic?: Record<
string,
(args: any, transcriptLogsFiltered: TranscriptItem[]) => Promise<any> | any
>;
downstreamAgents?: AgentConfig[] | { name: string; publicDescription: string }[];
metadata?: {
    version: string;
    updatedAt: string;
    promptId?: string; // Link to MCP prompt
    resources?: string[]; // URIs of linked resources
  };
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



// embedded object on LibraryToolSchema returned by mcp server
const InputSchemaSchema = z.object({
  type: z.literal("object"),
  properties: z.record(
    z.object({
      type: z.string(),
      description: z.string().optional(),
      enum: z.array(z.string()).optional(),
      minimum: z.number().optional(),
      maximum: z.number().optional(),
    })
  ),
  required: z.array(z.string()).optional(),
  additionalProperties: z.boolean().optional(),
  $schema: z.string().optional(),
});

// tool definition for MCP Server 
export const LibraryToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: InputSchemaSchema,
  agentId: z.string().optional(), // Keep agentId for filtering
});

// Define the array schema
export const ListToolsResponseSchema = z.object({
  tools: z.array(LibraryToolSchema),
});

// Tool definition for OpenAI Live API
export interface OpenAITool {
  type: "function";
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description?: string; enum?: string[]; minimum?: number; maximum?: number }>;
    required: string[];
    additionalProperties: boolean;
  };
}

// Transcript Item (used in conversation transcripts)
export interface TranscriptItem {
  itemId: string;
  type: "MESSAGE" | "BREADCRUMB";
  role?: "user" | "assistant" | "system";
  title?: string;
  data?: Record<string, any>;
  expanded: boolean;
  timestamp: string;
  createdAtMs: number;
  status: "IN_PROGRESS" | "DONE";
  isHidden: boolean;
  agentId?: string; // Add agentId for filtering tools
}


// lib/types.ts

// Common error structure for server events
interface RealtimeError {
  type: string; // e.g., "invalid_request_error"
  code: string; // e.g., "invalid_event"
  message: string;
  param?: string | null;
  event_id?: string;
}

// Tool definition (aligned with OpenAI's function schema)
interface RealtimeTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description?: string }>;
      required?: string[];
      additionalProperties?: boolean;
    };
  };
}

// Session configuration
interface RealtimeSession {
  id: string;
  object: 'realtime.session';
  model: string; // e.g., "gpt-4o-realtime-preview"
  modalities: ('text' | 'audio')[];
  instructions: string;
  voice: 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse';
  input_audio_format: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  output_audio_format: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  input_audio_transcription: {
    model: 'whisper-1';
    language?: string | null;
    prompt?: string;
  } | null;
  turn_detection: {
    type: 'server_vad';
    threshold: number;
    prefix_padding_ms: number;
    silence_duration_ms: number;
    create_response: boolean;
  } | null;
  tools: RealtimeTool[];
  tool_choice: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
  temperature: number;
  max_response_output_tokens: number | 'inf';
  client_secret?: {
    value: string;
    expires_at: number;
  };
}

// Conversation resource
interface RealtimeConversation {
  id: string;
  object: 'realtime.conversation';
}

// Content part for items
interface ContentPart {
  type: 'text' | 'audio' | 'input_text' | 'input_audio';
  text?: string;
  transcript?: string | null;
  audio?: string; // Base64-encoded audio
}

// Conversation item
interface RealtimeItem {
  id: string;
  object: 'realtime.item';
  type: 'message' | 'function_call' | 'function_call_output';
  status: 'in_progress' | 'completed';
  role?: 'user' | 'assistant';
  content?: ContentPart[];
  call_id?: string;
  name?: string;
  arguments?: string; // JSON string
  output?: string; // JSON string for function_call_output
}

// Response resource
interface RealtimeResponse {
  id: string;
  object: 'realtime.response';
  status: 'in_progress' | 'completed' | 'cancelled' | 'failed';
  status_details: { type: 'error'; error: RealtimeError } | null;
  output: RealtimeItem[];
  usage: {
    total_tokens: number;
    input_tokens: number;
    output_tokens: number;
    input_token_details: {
      cached_tokens: number;
      text_tokens: number;
      audio_tokens: number;
      cached_tokens_details: {
        text_tokens: number;
        audio_tokens: number;
      };
    };
    output_token_details: {
      text_tokens: number;
      audio_tokens: number;
    };
  } | null;
}

// Log probabilities for transcriptions
interface LogProb {
  token: string;
  logprob: number;
  bytes: number[] | null;
}

// Rate limit information
interface RateLimit {
  name: string;
  limit: number;
  remaining: number;
  reset_seconds: number;
}

// Transcription session configuration
interface RealtimeTranscriptionSession {
  id: string;
  object: 'realtime.transcription_session';
  expires_at?: number;
  modalities: ('text' | 'audio')[];
  input_audio_format: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  input_audio_transcription: {
    model: 'gpt-4o-transcribe';
    language?: string | null;
    prompt?: string;
  };
  turn_detection: {
    type: 'server_vad';
    threshold: number;
    prefix_padding_ms: number;
    silence_duration_ms: number;
    create_response: boolean;
  } | null;
  input_audio_noise_reduction?: { type: 'near_field' } | null;
  include?: string[];
  client_secret?: {
    value: string;
    expires_at: number;
  } | null;
}

// Discriminated union for server events
export type ServerEvent =
  | {
      type: 'error';
      event_id: string;
      error: RealtimeError;
    }
  | {
      type: 'session.created' | 'session.updated';
      event_id: string;
      session: RealtimeSession;
    }
  | {
      type: 'conversation.created';
      event_id: string;
      conversation: RealtimeConversation;
    }
  | {
      type: 'conversation.item.created' | 'conversation.item.retrieved';
      event_id: string;
      previous_item_id?: string;
      item: RealtimeItem;
    }
  | {
      type: 'conversation.item.input_audio_transcription.completed';
      event_id: string;
      item_id: string;
      content_index: number;
      transcript: string;
      logprobs: LogProb[] | null;
    }
  | {
      type: 'conversation.item.input_audio_transcription.delta';
      event_id: string;
      item_id: string;
      content_index: number;
      delta: string;
      logprobs: LogProb[] | null;
    }
  | {
      type: 'conversation.item.input_audio_transcription.failed';
      event_id: string;
      item_id: string;
      content_index: number;
      error: RealtimeError;
    }
  | {
      type: 'conversation.item.truncated';
      event_id: string;
      item_id: string;
      content_index: number;
      audio_end_ms: number;
    }
  | {
      type: 'conversation.item.deleted';
      event_id: string;
      item_id: string;
    }
  | {
      type: 'input_audio_buffer.committed';
      event_id: string;
      previous_item_id?: string;
      item_id: string;
    }
  | {
      type: 'input_audio_buffer.cleared';
      event_id: string;
    }
  | {
      type: 'input_audio_buffer.speech_started';
      event_id: string;
      audio_start_ms: number;
      item_id: string;
    }
  | {
      type: 'input_audio_buffer.speech_stopped';
      event_id: string;
      audio_end_ms: number;
      item_id: string;
    }
  | {
      type: 'response.created' | 'response.done';
      event_id: string;
      response: RealtimeResponse;
    }
  | {
      type: 'response.output_item.added' | 'response.output_item.done';
      event_id: string;
      response_id: string;
      output_index: number;
      item: RealtimeItem;
    }
  | {
      type: 'response.content_part.added' | 'response.content_part.done';
      event_id: string;
      response_id: string;
      item_id: string;
      output_index: number;
      content_index: number;
      part: ContentPart;
    }
  | {
      type: 'response.text.delta';
      event_id: string;
      response_id: string;
      item_id: string;
      output_index: number;
      content_index: number;
      delta: string;
    }
  | {
      type: 'response.text.done';
      event_id: string;
      response_id: string;
      item_id: string;
      output_index: number;
      content_index: number;
      text: string;
    }
  | {
      type: 'response.audio_transcript.delta';
      event_id: string;
      response_id: string;
      item_id: string;
      output_index: number;
      content_index: number;
      delta: string;
    }
  | {
      type: 'response.audio_transcript.done';
      event_id: string;
      response_id: string;
      item_id: string;
      output_index: number;
      content_index: number;
      transcript: string;
    }
  | {
      type: 'response.audio.delta';
      event_id: string;
      response_id: string;
      item_id: string;
      output_index: number;
      content_index: number;
      delta: string; // Base64-encoded audio
    }
  | {
      type: 'response.audio.done';
      event_id: string;
      response_id: string;
      item_id: string;
      output_index: number;
      content_index: number;
    }
  | {
      type: 'response.function_call_arguments.delta';
      event_id: string;
      response_id: string;
      item_id: string;
      output_index: number;
      call_id: string;
      name: string;
      delta: string; // JSON string
    }
  | {
      type: 'response.function_call_arguments.done';
      event_id: string;
      response_id: string;
      item_id: string;
      output_index: number;
      call_id: string;
      name: string;
      arguments: string; // JSON string
    }
  | {
      type: 'transcription_session.updated';
      event_id: string;
      session: RealtimeTranscriptionSession;
    }
  | {
      type: 'rate_limits.updated';
      event_id: string;
      rate_limits: RateLimit[];
    }
  | {
      type: 'output_audio_buffer.started' | 'output_audio_buffer.stopped' | 'output_audio_buffer.cleared';
      event_id: string;
      response_id: string;
    };


// Export types
export type AgentProfile = z.infer<typeof AgentProfileSchema>;
export type AgentPrompt = z.infer<typeof AgentPromptSchema>
export type StateMachineStep = z.infer<typeof StateMachineStepSchema>
export type LibraryTool = z.infer<typeof LibraryToolSchema>;






