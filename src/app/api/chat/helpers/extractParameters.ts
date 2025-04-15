// Helper: Extract parameters from user query
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { buildZodSchema } from "./buildZodSchema";
import {Tool} from "@/lib/types"

export async function extractParameters(
    query: string,
    schema: Tool["inputSchema"]
  ): Promise<Record<string, any>> {
    const zodSchema = buildZodSchema(schema);
    const prompt = 
      `Extract parameters from the user query based on this schema:
      ${JSON.stringify(schema, null, 2)}
      
      Query: "${query.replace(/"/g, '\\"')}"
      
      Respond with a VALID JSON object containing only the parameters explicitly mentioned in the query.
      If a parameter is not mentioned, exclude it from the response.
      Return ONLY the raw JSON string, with no markdown, no extra text, and no explanations.
      Example: {"repo": "proximity"}`
    ;
  
    try {
      const result = await generateText({
        model: openai("gpt-4o"),
        temperature: 0,
        system: prompt,
        messages: [{ role: "user", content: "Extract parameters" }],
      });
      const parsed = JSON.parse(result.text);
      return zodSchema.partial().parse(parsed);
    } catch (e) {
      console.error("Failed to parse parameters:", e);
      return {};
    }
  }