// src/types/AgentProfile.ts
export interface AgentProfile {
  id: string; // Unique identifier (e.g., "004")
  name: string; // Internal name (e.g., "StrategicMachines")
  displayName: string; // UI-friendly name (e.g., "StrategicMachines Agent")
  provider: string; // Company/tenant (e.g., "Strategic Machines")
  description: string; // Purpose and capabilities
  logo: string; // URL to logo
  avatar: string; // URL to avatar
  categories: string[]; // Tags (e.g., ["Voice Agent", "Web Tour"])
  visibility: "public" | "private" | "tenant"; // Access control
  active: boolean; // Enabled/disabled
  downstreamAgentIds: string[]; // Related agents (e.g., ["Reservations"])
  voice: string; // Voice prop (e.g., "coral")
  component: string; // UI component path (e.g., "agents/components/placeholder-form")
  tenantId: string; // Tenant identifier for multi-tenancy
  createdAt: Date;
  updatedAt: Date;
}

// src/types/AgentTypes.ts

// Simplified JSONSchema type (replace with a specific type if using a JSON Schema library)
type JSONSchema = any;

// Agent Configuration
export interface AgentConfiguration {
  id: string; // Unique identifier
  profileId: string; // Links to AgentProfiles.id
  name: string; // Agent name (e.g., "mainAgent")
  publicDescription: string; // Context for agent transfer
  instructions: string; // Prompt for main/supervisor agent
  tools: Tool[]; // Array of tool definitions
  downstreamAgents: { name: string; publicDescription: string }[]; // Simplified downstream agents
  metadata: {
    version: string;
    updatedAt: string;
    promptId?: string; // Optional prompt identifier
    resources?: string[]; // Optional array of resource URIs
  };
  isSupervisor: boolean; // True for supervisor agents
  tenantId: string; // Tenant identifier
  createdAt: Date;
  updatedAt: Date;
}

// Tool Definition
export interface Tool {
  type: "function";
  name: string; // e.g., "getNextResponse"
  description: string;
  parameters: JSONSchema; // Zod schema converted to JSON
  handlerId?: string; // Optional reference to handler logic
}

// Subscription
export interface Subscription {
  id: string;
  profileId: string;
  price: number;
  currency: string;
  terms: "flat_rate" | "usage_based" | "freemium";
  interval: "monthly" | "yearly" | "per_use";
  usageLimits: { calls?: number; minutes?: number };
  trialPeriod?: number; // Optional trial period in days
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Security Scheme
export interface SecurityScheme {
  id: string;
  profileId: string;
  type: "oauth2" | "api_key";
  location: "header" | "query";
  name: string;
  prefix?: string; // Optional prefix (e.g., "Bearer")
  clientId?: string; // Optional OAuth2 client ID
  clientSecret?: string; // Optional OAuth2 client secret
  scope?: string; // Optional OAuth2 scopes
  authorizeUrl?: string; // Optional OAuth2 authorization URL
  accessTokenUrl?: string; // Optional OAuth2 access token URL
  refreshTokenUrl?: string; // Optional OAuth2 refresh token URL
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Tool Handler
export interface ToolHandler {
  id: string;
  name: string; // e.g., "getNextResponse"
  description: string;
  code: string; // Server-side JavaScript/TypeScript function
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}