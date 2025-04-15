// Helper: Identify missing required fields
export function getMissingParams(
    schema: { type: "object"; properties?: Record<string, any>; required?: string[] } | null,
    inputs: Record<string, any>
  ): string[] {
    if (!schema) return []; // Handle null schema by returning empty array
    const required = schema.required ?? [];
    return required.filter((key: string) => !inputs[key]);
  }