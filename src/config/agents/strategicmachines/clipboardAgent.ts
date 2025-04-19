import { AgentConfig } from "@/lib/types";
import { toast } from "sonner"


const clipboardAgent: AgentConfig = {
  name: "clipboardAgent",
  publicDescription: "Copies provided text to the user's clipboard.",
  instructions:
    "You are an assistant that helps users by copying text to the clipboard. When provided with text, copy it to the clipboard and confirm the action with a clear message.",
  tools: [
    {
      type: "function",
      name: "copyToClipboard",
      description: "Copies text to the user's clipboard",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The text to copy",
          },
        },
        required: ["text"],
        additionalProperties: false,
      },
    },
  ],
  toolLogic: {
    copyToClipboard: ({ text }: { text: string }) => {
      navigator.clipboard.writeText(text);
      toast("tools.clipboard.toast" + " 📋", {
        description: "tools.clipboard.description",
      });
      return {
        success: true,
        text,
        message: "tools.clipboard.success"
      };
    },
  },
};

export default clipboardAgent;
