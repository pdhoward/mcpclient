// getToolSchema.ts
export function getToolSchema(tools: any[], toolName: string | undefined): any | null {
    if (!toolName) return null;
    const tool = tools.find((t) => t.name.toLowerCase() === toolName.toLowerCase());
    return tool?.inputSchema || null;
  }
  