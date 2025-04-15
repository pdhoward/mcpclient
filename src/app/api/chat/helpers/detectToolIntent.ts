// Helper: Detect tool intent from user message

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { Tool } from "@/lib/types";

export async function detectToolIntent(
    message: string,
    tools: Tool[]
  ): Promise<string | undefined> {
    const intentDetection = await generateText({
      model: openai("gpt-4o"),
      temperature: 0,
      system: 
        `You are an expert assistant mapping user requests to tools.
        Respond ONLY with the tool name or "unknown".
        
        Examples:
        - "Translate this to Spanish" → translate
        - "Get README file from repo" → get_file_contents
        - "create a new repo" → create_repository
        - "update an issue on a repo" → update_issue
        - "copy a github repo for me" → fork_repository
        - "search github for me" → search_code | search_issues | search_users
        - "unknown task" → unknown
        
        Available tools:
        ${tools.map((t) => `- ${t.name}: ${t.description}`).join("\n")}
    `,
      messages: [{ role: "user", content: message }],
    });
  
    const toolName = intentDetection.text.trim();
    return toolName === "unknown" ? undefined : toolName;
  }