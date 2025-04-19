import { AgentConfig } from "@/lib/types";

const timeAgent: AgentConfig = {
    name: "timeAgent",
    publicDescription:
      "Provides the current time and timezone information upon request.",
    instructions:
      "You are an assistant that delivers accurate current time information. When a user asks for the time, invoke the getCurrentTime tool to retrieve and communicate the current local time and timezone. Respond clearly and concisely.",
    tools: [
      {
        type: "function",
        name: "getCurrentTime",
        description: "Gets the current time in the user's timezone",
        parameters: {
            type: "object",
            properties: {},
          },
      },
    ],
    toolLogic: {
      getCurrentTime: ({}) => {
        const now = new Date();
        return {
          success: true,
          time: now.toLocaleTimeString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          message:
            "The current time is " +
            now.toLocaleTimeString() +
            " in the " +
            Intl.DateTimeFormat().resolvedOptions().timeZone +
            " timezone.",
        };
      },
    },
  };
  
  export default timeAgent;