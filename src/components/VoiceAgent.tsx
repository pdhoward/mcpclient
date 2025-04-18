"use client";

import { useEffect, useState } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { useSpeechSynthesis } from "react-speech-kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StopCircle } from "lucide-react";

interface VoiceAgentProps {
  persona: { name: string; avatar: string };
  isActive: boolean;
}

const personas = [
  {
    name: "Thalia",
    avatar: "https://www.datocms-assets.com/96965/1743435052-thalia.png",
  },
  {
    name: "Odysseus",
    avatar: "https://www.datocms-assets.com/96965/1743435516-odysseus.png",
  },
  {
    name: "Arcas",
    avatar: "https://www.datocms-assets.com/96965/1744230292-arcas.webp",
  },
  {
    name: "Andromeda",
    avatar: "https://www.datocms-assets.com/96965/1743434880-andromeda.png",
  },
];

const VoiceAgent = ({ persona, isActive }: VoiceAgentProps) => {
  const [conversation, setConversation] = useState<
    { role: string; content: string }[]
  >([]);
  const { transcript, resetTranscript } = useSpeechRecognition();
  const { speak } = useSpeechSynthesis();
  const [isProcessing, setIsProcessing] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [activePersona, setActivePersona] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');

  const handleAvatarClick = () => {
    setMenuOpen(prev => !prev);
    setActivePersona(null);
    setStatus('');
  };

  const startConversation = async (persona: string) => {
    setActivePersona(persona);
    setStatus('Initializing voice agent...');
    console.log(`Starting conversation with ${persona}`);
    // TODO: integrate OpenAI Realtime Voice API here
    // e.g., create a session via fetch('/api/realtime/sessions', { ... })
    // and connect via WebSocket or WebRTC client
    setTimeout(() => {
      setStatus(`Connected as ${persona}. Say "Hello!"`);
    }, 1000);
  };

  useEffect(() => {
    if (isActive) {
      const greeting = `Hi, I'm ${persona.name}! Do you have any questions about our product?`;
      setConversation([{ role: "assistant", content: greeting }]);
      speak({ text: greeting });
      SpeechRecognition.startListening({ continuous: true });
    }
    return () => {
      SpeechRecognition.stopListening();
    };
  }, [isActive, persona.name, speak]);

  const handleStop = async () => {
    SpeechRecognition.stopListening();
    setIsProcessing(true);
    const userMessage = transcript;
    if (userMessage) {
      const updatedConversation = [
        ...conversation,
        { role: "user", content: userMessage },
      ];
      setConversation(updatedConversation);
      resetTranscript();

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                content: `You are ${persona.name}, a friendly assistant.`,
              },
              ...updatedConversation,
            ],
          }),
        });
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        const aiResponse = data.content;
        setConversation([
          ...updatedConversation,
          { role: "assistant", content: aiResponse },
        ]);
        speak({ text: aiResponse });
      } catch (error) {
        console.error("Error with API:", error);
        const errorMessage = `Sorry, I couldn't process that. Please try again.`;
        setConversation([
          ...updatedConversation,
          { role: "assistant", content: errorMessage },
        ]);
        speak({ text: errorMessage });
      }
    }
    setIsProcessing(false);
    SpeechRecognition.startListening({ continuous: true });
  };

  if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
    return (
      <p className="text-sm text-gray-500">
        Your browser does not support speech recognition.
      </p>
    );
  }

  return (
    <>
    
    <Card className="max-h-[200px] overflow-y-auto">
      <CardContent className="p-2">
        {conversation.map((msg, idx) => (
          <p key={idx} className="text-sm mb-1">
            <strong
              className={
                msg.role === "assistant" ? "text-blue-600" : "text-green-600"
              }
            >
              {msg.role === "assistant" ? persona.name : "You"}:
            </strong>{" "}
            {msg.content}
          </p>
        ))}
        {isProcessing && <p className="text-sm text-gray-500">Processing...</p>}
        <Button
          onClick={handleStop}
          disabled={isProcessing}
          variant="outline"
          className="mt-2 w-full"
        >
          <StopCircle className="w-4 h-4 mr-2" />
          Stop and Process
        </Button>
      </CardContent>
    </Card>
    <div className="relative min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Floating GIF button */}
      <button
        onClick={handleAvatarClick}
        className="fixed bottom-5 right-5 z-50 p-2 bg-transparent animate-bounce"
      >
        <img
          src="/float-avatar.gif"
          alt="Click to talk to me"
          className="w-20 h-20"
        />
      </button>

      {/* Floating island menu */}
      {menuOpen && (
        <div className="fixed bottom-28 right-5 z-40 bg-white p-4 rounded-2xl shadow-2xl w-64">
          <h3 className="text-lg font-bold mb-2">Choose your persona</h3>
          <div className="flex flex-wrap gap-2">
            {personas.map(p => (
              <button
                key={p.name}
                onClick={() => startConversation(p.name)}
                className={`flex items-center space-x-2 p-2 rounded-lg border 
                  ${activePersona === p.name ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
              >
                <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full" />
                <span className="font-medium">{p.name}</span>
              </button>
            ))}
          </div>

          {/* Status / stubbed conversation panel */}
          {activePersona && (
            <div className="mt-4 p-2 bg-gray-100 rounded">
              <p className="text-sm italic">{status}</p>
            </div>
          )}
        </div>
      )}

      {/* Page content */}
      <main className="pt-16 text-center">
        <h1 className="text-3xl font-bold">Welcome to Your Voice Agent Demo</h1>
        <p className="mt-2 text-gray-600">
          Click the floating GIF in the corner to start speaking with your AI persona.
        </p>
      </main>
    </div>
    
    </>
  );
};

export default VoiceAgent;