import {
  exampleAccountInfo,
  examplePolicyDocs,
  exampleStoreLocations,
} from "./sampleData";

const supervisorAgentInstructions = `You are an expert supervisor agent for customer service, tasked with providing real-time guidance to a more junior agent. You will be given detailed response instructions, tools, and the full conversation history so far.

# Instructions
- You can provide an answer directly, or call a tool first and then answer the question
- If you need to call a tool, but don't have the right information, you can tell the junior agent to ask for that information in your message
- Your message will be read verbatim by the junior agent, so feel free to use it like you would talk directly to the user
  
==== Domain-Specific Agent Instructions ====
You are a helpful customer service agent working for NewTelco, helping a user efficiently fulfill their request while adhering closely to provided guidelines.

# Instructions
- Always greet the user at the start of the conversation with "Hi, you've reached NewTelco, how can I help you?"
- Always call a tool before answering factual questions about the company, its offerings or products, or a user's account. Only use retrieved context and never rely on your own knowledge for any of these questions.
- Escalate to a human if the user requests.
- Do not discuss prohibited topics (politics, religion, controversial current events, medical, legal, or financial advice, personal conversations, internal company operations, or criticism of any people or company).
- Rely on sample phrases whenever appropriate, but never repeat a sample phrase in the same conversation. Feel free to vary the sample phrases to avoid sounding repetitive and make it more appropriate for the user.
- Always follow the provided output format for new messages, including citations for any factual statements from retrieved policy documents.

# Response Instructions
- Maintain a professional and concise tone in all responses.
- Respond appropriately given the above guidelines.
- The message is for a voice conversation, so be very concise, use prose, and never create bulleted lists. Prioritize brevity and clarity over completeness.
    - Even if you have access to more information, only mention a couple of the most important items and summarize the rest at a high level.
- Do not speculate or make assumptions about capabilities or information. If a request cannot be fulfilled with available tools or information, politely refuse and offer to escalate to a human representative.
- If you do not have all required information to call a tool, you MUST ask the user for the missing information in your message. NEVER attempt to call a tool with missing, empty, placeholder, or default values (such as "", "REQUIRED", "null", or similar). Only call a tool when you have all required parameters provided by the user.
- Do not offer or attempt to fulfill requests for capabilities or services not explicitly supported by your tools or provided information.
- Only offer to provide more information if you know there is more information available to provide, based on the tools and context you have.

# Sample Phrases
## Deflecting a Prohibited Topic
- "I'm sorry, but I'm unable to discuss that topic. Is there something else I can help you with?"
- "That's not something I'm able to provide information on, but I'm happy to help with any other questions you may have."

## If you do not have a tool or information to fulfill a request
- "Sorry, I'm actually not able to do that. Would you like me to transfer you to someone who can help, or help you find your nearest NewTelco store?"
- "I'm not able to assist with that request. Would you like to speak with a human representative, or would you like help finding your nearest NewTelco store?"

## Before calling a tool
- "To help you with that, I'll just need to verify your information."
- "Let me check that for you—one moment, please."
- "I'll retrieve the latest details for you now."

## If required information is missing for a tool call
- "To help you with that, could you please provide your [required info, e.g., zip code/phone number]?"
- "I'll need your [required info] to proceed. Could you share that with me?"

# User Message Format
- Always include your final response to the user.
- When providing factual information from retrieved context, always include citations immediately after the relevant statement(s). Use the following citation format:
    - For a single source: [NAME](ID)
    - For multiple sources: [NAME](ID), [NAME](ID)
- Only provide information about this company, its policies, its products, or the customer's account, and only if it is based on information provided in context. Do not answer questions outside this scope.

# Example (tool call)
- User: Can you tell me about your family plan options?
- Supervisor Assistant: lookup_policy_document(topic="family plan options")
- lookup_policy_document(): [
  {
    id: "ID-010",
    name: "Family Plan Policy",
    topic: "family plan options",
    content:
      "The family plan allows up to 5 lines per account. All lines share a single data pool. Each additional line after the first receives a 10% discount. All lines must be on the same account.",
  },
  {
    id: "ID-011",
    name: "Unlimited Data Policy",
    topic: "unlimited data",
    content:
      "Unlimited data plans provide high-speed data up to 50GB per month. After 50GB, speeds may be reduced during network congestion. All lines on a family plan share the same data pool. Unlimited plans are available for both individual and family accounts.",
  },
];
- Supervisor Assistant:
# Message
Yes we do—up to five lines can share data, and you get a 10% discount for each new line [Family Plan Policy](ID-010).

# Example (Refusal for Unsupported Request)
- User: Can I make a payment over the phone right now?
- Supervisor Assistant:
# Message
I'm sorry, but I'm not able to process payments over the phone. Would you like me to connect you with a human representative, or help you find your nearest NewTelco store for further assistance?
`;

export const supervisorAgentTools = [
  {
    type: "function",
    function: {
      name: "lookupPolicyDocument",
      description:
        "Tool to look up internal documents and policies by topic or keyword.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description:
              "The topic or keyword to search for in company policies or documents.",
          },
        },
        required: ["topic"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getUserAccountInfo",
      description:
        "Tool to get user account information. This only reads user accounts information, and doesn't provide the ability to modify or delete any values.",
      parameters: {
        type: "object",
        properties: {
          phone_number: {
            type: "string",
            description:
              "Formatted as '(xxx) xxx-xxxx'. MUST be provided by the user, never a null or empty string.",
          },
        },
        required: ["phone_number"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "findNearestStore",
      description:
        "Tool to find the nearest store location to a customer, given their zip code.",
      parameters: {
        type: "object",
        properties: {
          zip_code: {
            type: "string",
            description: "The customer's 5-digit zip code.",
          },
        },
        required: ["zip_code"],
        additionalProperties: false,
      },
    },
  },
];

async function fetchChatCompletionMessage(body: any) {
  const response = await fetch("/api/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...body, parallel_tool_calls: false }),
  });

  if (!response.ok) {
    console.warn("Server returned an error:", response);
    return { error: "Something went wrong." };
  }

  const completion = await response.json();
  return completion.choices[0].message;
}

function getToolResponse(fName: string) {
  switch (fName) {
    case "getUserAccountInfo":
      return exampleAccountInfo;
    case "lookupPolicyDocument":
      return examplePolicyDocs;
    case "findNearestStore":
      return exampleStoreLocations;
    default:
      return { result: true };
  }
}

async function handleToolCalls(
  body: any,
  message: any,
  addTranscriptBreadcrumb?: (title: string, data?: any) => void
) {
  while (message.tool_calls && message.tool_calls.length > 0) {
    const toolCall = message.tool_calls[0];
    const fName = toolCall.function.name;
    if (addTranscriptBreadcrumb)
      addTranscriptBreadcrumb(
        `[supervisorAgent] function call: ${fName}`,
        JSON.parse(toolCall.function.arguments)
      );
    const toolRes = getToolResponse(fName);
    if (addTranscriptBreadcrumb)
      addTranscriptBreadcrumb(
        `[supervisorAgent] function call result: ${fName}`,
        toolRes
      );
    body.messages.push(message);
    body.messages.push({
      role: "tool",
      tool_call_id: toolCall.id,
      content: JSON.stringify(toolRes),
    } as any); // hack for tool_call_id param
    message = await fetchChatCompletionMessage(body);
    if (message.error) {
      return { error: "Something went wrong." };
    }
  }
  return message;
}

function filterTranscriptLogs(transcriptLogs: any[]) {
  // Remove the first two BREADCRUMB items only
  let breadcrumbCount = 0;
  const filtered = [];
  for (const item of transcriptLogs) {
    if (item.type === "BREADCRUMB" && breadcrumbCount < 2) {
      breadcrumbCount++;
      continue;
    }
    if (item.type === "MESSAGE") {
      // Remove guardrailResult and expanded
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { guardrailResult, expanded, ...rest } = item;
      filtered.push(rest);
    } else {
      filtered.push(item);
    }
  }
  return filtered;
}

export async function getNextResponse(
  {
    relevantContextFromLastUserMessage,
  }: { relevantContextFromLastUserMessage: string },
  transcriptLogs: any[],
  addTranscriptBreadcrumb?: (title: string, data?: any) => void
) {
  const filteredLogs = filterTranscriptLogs(transcriptLogs);

  const body = {
    model: "gpt-4.1",
    messages: [
      {
        role: "system",
        content: supervisorAgentInstructions,
      },
      {
        role: "user",
        content: `==== Conversation History ====
    ${JSON.stringify(filteredLogs, null, 2)}
    
    ==== Relevant Context From Last User Message ===
    ${relevantContextFromLastUserMessage}
    `,
      },
    ],
    tools: supervisorAgentTools,
  };

  let message = await fetchChatCompletionMessage(body);
  if (message.error) {
    return { error: "Something went wrong." };
  }

  // Keep handling tool calls until there are none left
  while (message.tool_calls && message.tool_calls.length > 0) {
    message = await handleToolCalls(body, message, addTranscriptBreadcrumb);
    if (message.error) {
      return { error: "Something went wrong." };
    }
  }

  return { nextResponse: message.content };
}