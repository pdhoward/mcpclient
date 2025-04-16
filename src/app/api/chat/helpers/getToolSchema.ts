// getToolSchema.ts
import { ToolSchema } from "@/lib/types";

export function getToolSchema(
  tools: Array<{ name: string; inputSchema: ToolSchema }>,
  toolName: string | undefined
): ToolSchema | null {
    if (!toolName) return null;
    const tool = tools.find((t) => t.name.toLowerCase() === toolName.toLowerCase());
    return tool?.inputSchema || null; // Use schema instead of inputSchema
  }
  