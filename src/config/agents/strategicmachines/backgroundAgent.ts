import { AgentConfig } from "@/lib/types";
import { toast } from "sonner"

const backgroundAgent: AgentConfig = {
  name: "backgroundAgent",
  publicDescription:
    "Toggles the background color of the page between light and dark modes.",
  instructions:
    "You are an assistant that manages the background color of the page. When asked to change the background color, toggle between light and dark modes. Notify the user of the change using a brief message.",
  tools: [
    {
      type: "function",
      name: "changeBackgroundColor",
      description: "Changes the background color of the page",
      parameters: {
        type: "object",
        properties: {
          color: {
            type: "string",
            description:
              "Color value (hex, rgb, or color name). This parameter is currently ignored as the tool toggles the theme.",
          },
        },
      },
    },
  ],
  toolLogic: {
    changeBackgroundColor: () => {
      try {
        const html = document.documentElement;
        // Determine current theme and toggle
        const currentTheme = html.classList.contains("dark") ? "dark" : "light";
        const newTheme = currentTheme === "dark" ? "light" : "dark";

        // Update the document's theme classes
        html.classList.remove(currentTheme);
        html.classList.add(newTheme);

        // Show a toast notification with hardcoded messages
        toast(`Switched to ${newTheme} mode! 🌓`, {
          description: "Background theme switched to " + newTheme + ".",
        });

        return {
          success: true,
          theme: newTheme,
          message: "Background theme switched to " + newTheme + ".",
        };
      } catch (error: any) {
        return {
          success: false,
          message: "Failed to switch theme: " + error.message,
        };
      }
    },
  },
};

export default backgroundAgent;
