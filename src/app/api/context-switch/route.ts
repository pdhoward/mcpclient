import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { Agent, Conversation } from "@/lib/types";
import { z } from 'zod';

interface ContextSwitchRequest {
  message: string;
  currentAgentId: string | null;
  agents: Agent[];
  conversationHistory: Conversation;
}

export async function POST(req: Request) {
  try {
    const { message, currentAgentId, agents, conversationHistory }: ContextSwitchRequest = await req.json();

    // Format conversation history for the prompt
    const formattedHistory = conversationHistory
      .map(msg => `${msg.role}: ${msg.context.message}`)
      .join('\n');

    // Format available agents for the prompt
    const formattedAgents = agents
      .filter(agent => agent.isActive)
      .map(agent => {
        const configurationSummary = agent.configuration
          ? Object.entries(agent.configuration)
              .map(([key, value]) => {
                const formattedValue = Array.isArray(value)
                  ? value.join(', ')
                  : value.toString();
                return `${key}: ${formattedValue}`;
              })
              .join('; ')
          : "No configuration available"; // Fallback if configuration is null

        return `
            - Name: ${agent.name}
              agentId: ${agent.id}
              Description: ${agent.description}
              Configuration: ${configurationSummary}`;
                  })
                  .join('\n');

    const prompt = `
          You are an AI coordinator responsible for routing conversations to the most appropriate specialized agent.

          Available Agents:
            ${formattedAgents}

          Current Agent: ${currentAgentId ? agents.find(a => a.id === currentAgentId)?.id : 'None'}

          Recent Conversation History:
            ${formattedHistory}

          Latest User Message: "${message}"

          Task:
          1. Analyze the conversation context and latest message
          2. Determine if a different agent would be better suited to handle the user's request
          3. Consider:
            - The specific capabilities of each agent
            - The context of the entire conversation
            - The nature of the latest request
            - Avoid unnecessary switches for minor variations

          Output *only* valid JSON in this format:
          {
            "name": "name of the most appropriate agent, or null if current agent is appropriate"
            "id": "id of the most appropriate agent, or null if current agent is appropriate",
            "confidence": 0.0-1.0,
            "message": "brief explanation of your reasoning"
          }`;


    const { object  } = await generateObject({
      model: openai('gpt-4o'),     
      prompt, 
      temperature: 0.1,
      maxTokens: 500,
      schema: z.object({
        context: z.object({
          name: z.string(),
          id: z.string(),
          confidence: z.number(),
          message: z.string()
        }),
      }),
    })

    // Ensure no null values for name or id
    if (object.context.name === null || object.context.id === null) {
      const currentAgent = agents.find((a) => a.id === currentAgentId);
      object.context.name = currentAgent?.name || "Unknown Agent";
      object.context.id = currentAgent?.id || "unknown-agent";
      object.context.confidence = 1.0
      object.context.message = "No agent switch detected"
    }

    return NextResponse.json(object);  

  } catch (error: any) {
    console.error('Context switch error:', error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to process context switch",
        details: error.message 
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}