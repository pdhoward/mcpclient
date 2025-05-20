import { AgentConfig } from "@/lib/types";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { animate as framerAnimate } from "framer-motion";

const celebrateAgent: AgentConfig = {
  name: "celebrateAgent",
  publicDescription:
    "Triggers a confetti animation and dynamic background color changes to create a festive atmosphere.",
  instructions:
    "You are an energetic party assistant. When triggered, you launch a confetti animation and change the background colors dynamically to evoke a celebration mood. Respond cheerfully to amplify the festive vibe.",
  tools: [
    {
      type: "function",
      name: "partyMode",
      description: "Triggers a confetti animation on the page",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  ],
  toolLogic: {
    partyMode: ({}) => {
      try {
        const duration = 5 * 1000;
        const colors = [
          "#a786ff",
          "#fd8bbc",
          "#eca184",
          "#f8deb1",
          "#3b82f6",
          "#14b8a6",
          "#f97316",
          "#10b981",
          "#facc15",
        ];

        const confettiConfig = {
          particleCount: 30,
          spread: 100,
          startVelocity: 90,
          colors,
          gravity: 0.5,
        };

        const shootConfetti = (angle: number, origin: { x: number; y: number }) => {
          confetti({
            ...confettiConfig,
            angle,
            origin,
          });
        };

        const animate = () => {
          const now = Date.now();
          const end = now + duration;

          const elements = document.querySelectorAll("div, p, button, h1, h2, h3");
          elements.forEach((element) => {
            framerAnimate(
              element,
              {
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              },
              {
                duration: 0.5,
                repeat: 10,
                ease: "easeInOut",
              }
            );
          });

          const frame = () => {
            if (Date.now() > end) return;
            shootConfetti(60, { x: 0, y: 0.5 });
            shootConfetti(120, { x: 1, y: 0.5 });
            requestAnimationFrame(frame);
          };

          const mainElement = document.querySelector("main");
          if (mainElement) {
            mainElement.classList.remove("bg-linear-to-b", "from-gray-50", "to-white");
            const originalBg = mainElement.style.backgroundColor;

            const changeColor = () => {
              const now = Date.now();
              const end = now + duration;

              const colorCycle = () => {
                if (Date.now() > end) {
                  framerAnimate(
                    mainElement,
                    { backgroundColor: originalBg },
                    { duration: 0.5 }
                  );
                  return;
                }
                const newColor = colors[Math.floor(Math.random() * colors.length)];
                framerAnimate(
                  mainElement,
                  { backgroundColor: newColor },
                  { duration: 0.2 }
                );
                setTimeout(colorCycle, 200);
              };

              colorCycle();
            };

            changeColor();
          }

          frame();
        };

        animate();
        toast.success("Party mode activated! 🎉", {
          description: "Confetti animation and dynamic background colors are now active.",
        });
        return { success: true, message: "Party mode activated successfully! 🎉" };
      } catch (error: any) {
        return { success: false, message: "Party mode failed: " + error.message };
      }
    },
  },
};

export default celebrateAgent;

