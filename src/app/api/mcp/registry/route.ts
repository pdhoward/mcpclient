import { NextResponse } from 'next/server';
import {z} from "zod"


// Define the schemas using Zod
const WeatherToolSchemas = {
  getAlerts: {
    state: z.string().length(2).describe("Two-letter state code (e.g. CA, NY)")
  },
  getForecast: {
    latitude: z.number().min(-90).max(90).describe("Latitude of the location"),
    longitude: z.number().min(-180).max(180).describe("Longitude of the location")
  }
} as const;

// MCP Registry types
interface MCPRegistryEntry {
  id: string;
  name: string;
  version: string;
  description: string;
  endpoint: string;
  tools: MCPToolDefinition[];
}

// Tool definition for registry
export interface MCPToolDefinition {
  name: string;
  description: string;
  schema: Record<string, unknown>;
}


// In-memory registry for demo purposes
// In production, this would be stored in a database
const mcpRegistry: MCPRegistryEntry[] = [
  {
    id: 'weather-mcp',
    name: 'Weather Service',
    version: '1.0.0',
    description: 'MCP service for weather forecasts and alerts',
    endpoint: '/api/mcp/weather',
    tools: [
      {
        name: 'get-weather-alerts',
        description: 'Get weather alerts for a state',
        schema: WeatherToolSchemas.getAlerts
      },
      {
        name: 'get-weather-forecast',
        description: 'Get weather forecast for a location',
        schema: WeatherToolSchemas.getForecast
      }
    ]
  }
];

export async function GET() {
  return NextResponse.json(mcpRegistry);
}