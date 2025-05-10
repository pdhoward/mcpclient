import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { Message, MessageStatus } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/////////////////////////////////////////////////////
// set of function to filter and display messages //
//    in a real time voice application           //
//////////////////////////////////////////////////

export function getMessageStatus(msg: Message): MessageStatus {
  if (msg.context && 'isComplete' in msg.context) {
    return msg.context.isComplete ? 'done' : 'processing';
  }
  return 'done';
}

export function getMessageText(msg: Message): string {
  return msg.context &&  'message' in msg.context ? msg.context.message : '';
}

export function isMessageFinal(msg: Message): boolean {
  if (msg.context && 'isComplete' in msg.context && typeof msg.context.isComplete === 'boolean') {
    return msg.context.isComplete;
  }
  return true;
}

/**
* Decide if a conversation item should be displayed or filtered out. 
* Optional, this is used to filter out empty or useless user messages
*/
export function shouldDisplayMessage(msg: Message): boolean {
  const { role } = msg;
  const text = getMessageText(msg).trim();
  const status = getMessageStatus(msg);
  const isFinal = isMessageFinal(msg);

  // Always display assistant messages
  if (role === "assistant") return true;

  // Always display messages with "processing" status
  if (status === "processing") return true;

  // Display user/system messages only if final and not empty
  return isFinal && text.length > 0;
}

/////////////////////////////////////////////////////
// function to configure the real time agents     //
///////////////////////////////////////////////////

import { AgentConfig, Tool } from "@/lib/types";

/**
 * This defines and adds "transferAgents" tool dynamically based on the specified downstreamAgents on each agent.
 */
export function injectTransferTools(agentDefs: AgentConfig[]): AgentConfig[] {
  // Iterate over each agent definition
  agentDefs.forEach((agentDef) => {
    const downstreamAgents = agentDef.downstreamAgents || [];

    // Only proceed if there are downstream agents
    if (downstreamAgents.length > 0) {
      // Build a list of downstream agents and their descriptions for the prompt
      const availableAgentsList = downstreamAgents
        .map(
          (dAgent) =>
            `- ${dAgent.name}: ${dAgent.publicDescription ?? "No description"}`
        )
        .join("\n");

      // Create the transfer_agent tool specific to this agent
      const transferAgentTool: Tool = {
        type: "function",
        name: "transferAgents",
        description: `Triggers a transfer of the user to a more specialized agent. 
  Calls escalate to a more specialized LLM agent or to a human agent, with additional context. 
  Only call this function if one of the available agents is appropriate. Don't transfer to your own agent type.
  
  Let the user know you're about to transfer them before doing so.
  
  Available Agents:
  ${availableAgentsList}
        `,
        parameters: {
          type: "object",
          properties: {
            rationale_for_transfer: {
              type: "string",
              description: "The reasoning why this transfer is needed.",
            },
            conversation_context: {
              type: "string",
              description:
                "Relevant context from the conversation that will help the recipient perform the correct action.",
            },
            destination_agent: {
              type: "string",
              description:
                "The more specialized destination_agent that should handle the user’s intended request.",
              enum: downstreamAgents.map((dAgent) => dAgent.name),
            },
          },
          required: [
            "rationale_for_transfer",
            "conversation_context",
            "destination_agent",
          ],
        },
      };

      // Ensure the agent has a tools array
      if (!agentDef.tools) {
        agentDef.tools = [];
      }

      // Add the newly created tool to the current agent's tools
      agentDef.tools.push(transferAgentTool);
    }

    // so .stringify doesn't break with circular dependencies
    agentDef.downstreamAgents = agentDef.downstreamAgents?.map(
      ({ name, publicDescription }) => ({
        name,
        publicDescription,
      })
    );
  });

  return agentDefs;
}