import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { fetchToolsAndClient } from "./helpers/fetchToolsAndClient";
import { getToolSchema } from "./helpers/getToolSchema";
import { getMissingParams } from "./helpers/getMissingParams";
import { extractParameters } from "./helpers/extractParameters";
import { detectToolIntent } from "./helpers/detectToolIntent";
import { handleContextSwitch } from "./helpers/handleContextSwitch";
import { handlePendingContextSwitch } from "./helpers/handlePendingContextSwitch";
import { Message } from "@/lib/types";

// Main API handler
export async function POST(req: Request) {
  try {
    // Phase 1: Parse request and fetch tools
    const { messages }: { messages: Message[] } = await req.json();
    const lastMessage = messages[messages.length - 1];
    console.log("🟡 POST started");
    console.log("🔹 User Last Message:", lastMessage);

    const { tools, client } = await fetchToolsAndClient();
    console.log("🔹 Step 1: Tools fetched");

    // Phase 2: Recover prior state
    const previousAnnotations = messages
      .flatMap((m) => m.annotations || [])
      .filter((a) => a.type === "tool-input-state");

    let toolName: string | undefined = undefined;
    let collectedInputs: Record<string, any> = {};
    let finished = false;
    let contextStatePending = false;
    let toolPending: string | undefined = undefined;
    let toolSchema: any = null; // Initialize toolSchema

    if (previousAnnotations.length > 0) {
      const latest = previousAnnotations[previousAnnotations.length - 1];
      toolName = latest.toolName;
      collectedInputs = latest.collectedInputs || {};
      finished = latest.finished || false;
      contextStatePending = latest.contextStatePending || false;
      toolPending = latest.toolPending || undefined;
      console.log("🔹 Step 2: Recovered state:", { toolName, collectedInputs, finished });
    }

     // Phase 3: Get tool schema and missing params
     if (toolName) {
      toolSchema = getToolSchema(tools, toolName);
      if (!toolSchema) {
        throw new Error(`Tool schema for ${toolName} not found`);
      }
    }

    const missingParams = getMissingParams(toolSchema, collectedInputs);
    console.log("🔹 Step 3: Missing params:", missingParams);

    // Phase 4: Handle context switch or confirmation
    if (lastMessage.role === "user") {
      if (contextStatePending) {
        const { response, newToolName, newCollectedInputs, newFinished } =
          await handlePendingContextSwitch(
            lastMessage,
            toolName,
            toolPending,
            collectedInputs,
            finished,
            missingParams
          );
        if (response) {
          return new Response(JSON.stringify(response), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        toolName = newToolName;
        collectedInputs = newCollectedInputs;
        finished = newFinished;
         // Update toolSchema after context switch
         if (toolName) {
          toolSchema = getToolSchema(tools, toolName);
          if (!toolSchema) {
            throw new Error(`Tool schema for ${toolName} not found after context switch`);
          }
        }
      } else {
        const { response, newToolName, newCollectedInputs, newFinished } =
          await handleContextSwitch(
            lastMessage,
            tools,
            toolName,
            collectedInputs,
            finished,
            missingParams
          );
        if (response) {
          return new Response(JSON.stringify(response), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        toolName = newToolName;
        collectedInputs = newCollectedInputs;
        finished = newFinished;
        // Update toolSchema after context switch
        if (toolName) {
          toolSchema = getToolSchema(tools, toolName);
          if (!toolSchema) {
            throw new Error(`Tool schema for ${toolName} not found after context switch`);
          }
        }
      }
    }

    // Phase 5: Detect tool intent if no prior state
    if (!toolName && lastMessage.role === "user") {
      toolName = await detectToolIntent(lastMessage.content, tools);
      console.log("🔹 Step 4: Intent detected:", toolName);

      if (!toolName) {
        const response: Message = {
          role: "assistant",
          content: "❌ No suitable tool detected. Please clarify your request.",
          timestamp: Date.now(),
        };
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      toolSchema = getToolSchema(tools, toolName);
      if (!toolSchema) {
        throw new Error(`Tool schema for ${toolName} not found`);
      }
      collectedInputs = await extractParameters(lastMessage.content, toolSchema);
      finished = false;
      console.log("🔹 Step 5: Initial inputs:", collectedInputs);
    }

    // Phase 6: Update collected inputs with new parameters
    if (previousAnnotations.length > 0 && lastMessage.role === "user" && toolName && toolSchema) {
      const latestPrompt = `
        Given the current collected inputs:
        ${JSON.stringify(collectedInputs, null, 2)}
        
        And the schema:
        ${JSON.stringify(toolSchema, null, 2)}
        
        Extract any new parameters from this user message: "${lastMessage.content.replace(/"/g, '\\"')}"
        Respond with a VALID JSON object containing only the new parameters (e.g., {"owner": "machine"}).
        Return ONLY the raw JSON string, with no markdown, no extra text, and no explanations.
      `;
      try {
        const newParamsResult = await generateText({
          model: openai("gpt-4o"),
          temperature: 0,
          system: latestPrompt,
          messages: [{ role: "user", content: "Extract new parameters" }],
        });
        const newParams = JSON.parse(newParamsResult.text);
        collectedInputs = { ...collectedInputs, ...newParams };
        console.log("🔹 Step 6: Updated inputs:", collectedInputs);
      } catch (e) {
        console.error("Failed to parse new params:", e);
      }
    }

   
    // Phase 7: Check missing parameters
    if (!toolSchema && toolName) {
      toolSchema = getToolSchema(tools, toolName);
      if (!toolSchema) {
        throw new Error(`Tool schema for ${toolName} not found in parameter check`);
      }
    }
    const updatedMissingParams = getMissingParams(toolSchema, collectedInputs);
    console.log("🔹 Step 7: Updated missing params:", updatedMissingParams);
    console.log("🔹 Step 7 Continued: toolschema and inputs collected", toolSchema, collectedInputs);

    // Phase 8: Respond based on state
    if (updatedMissingParams.length === 0) {
      const response: Message = {
        role: "assistant",
        content: "✅ All parameters collected. Ready to proceed.",
        annotations: [
          {
            type: "tool-input-state",
            toolName,
            collectedInputs,
            finished: true,
            contextStatePending: false,
            toolPending: undefined,
          },
        ],
        timestamp: Date.now(),
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Phase 9: Prompt user for the next missing parameter
    const nextParam = updatedMissingParams[0];
    const paramDescription =
      toolSchema?.properties?.[nextParam]?.description || `the ${nextParam}`;

    const promptResponse = await generateText({
      model: openai("gpt-4o"),
      temperature: 1.0,
      system: `
        You are a helpful assistant guiding the user to provide missing parameters.
        Current collected inputs: ${JSON.stringify(collectedInputs, null, 2)}
        Missing parameter: ${nextParam}
        Description: ${paramDescription}
        
        Generate a natural, concise prompt asking the user to provide the missing parameter.
      `,
      messages: [{ role: "user", content: "" }],
    });

    const response: Message = {
      role: "assistant",
      content: promptResponse.text,
      annotations: [
        {
          type: "tool-input-state",
          toolName,
          collectedInputs,
          finished: false,
          contextStatePending: false,
          toolPending: undefined,
        },
      ],
      timestamp: Date.now(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Fatal error in POST handler:", error);
    const response: Message = {
      role: "assistant",
      content: error instanceof Error ? error.message : "Unknown error",
      timestamp: Date.now(),
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}