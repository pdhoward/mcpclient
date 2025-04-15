// Helper: Map tool schema to Zod object
import {z} from "zod"
import {Tool} from "@/lib/types"

export function buildZodSchema(schema: Tool["inputSchema"]): z.ZodObject<any> {
    if (!schema?.properties) return z.object({});
    const properties = schema.properties;
    return z.object(
      Object.keys(properties).reduce((acc, key) => {
        const prop = properties[key];
        let zodType: z.ZodType<any>;
        switch (prop.type) {
          case "string":
            zodType = z.string().min(1);
            break;
          case "number":
            zodType = z.number();
            break;
          case "boolean":
            zodType = z.boolean();
            break;
          case "enum":
            zodType = z.enum(prop.enum || [""]);
            break;
          default:
            zodType = z.any();
            break;
        }
        acc[key] = zodType;
        return acc;
      }, {} as Record<string, z.ZodType<any>>)
    );
  }