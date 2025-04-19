"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StopCircle } from "lucide-react";

interface VoiceAgentProps {
  persona: { name: string; avatar: string };
  isActive: boolean;
  onStop: () => void;
}

const VoiceAgent = ({ persona, isActive, onStop }: VoiceAgentProps) => {
  const [conversation, setConversation] = useState<
    { role: string; content: string }[]
  >([]);
  const { transcript, resetTranscript, listening } = useSpeechRecognition();
  const [isProcessing, setIsProcessing] = useState(false);
  const isMounted = useRef(true);
  const hasGreeted = useRef(false);
  const lastTranscript = useRef("");
  const speechTimeout = useRef<NodeJS.Timeout | null>(null);

  // Check browser support for speech synthesis
  const speechSupported = typeof window !== "undefined" && "SpeechSynthesisUtterance" in window;

  // Start or stop speech recognition
  const manageSpeechRecognition = useCallback(() => {
    if (isActive && !listening && !isProcessing && isMounted.current) {
      console.log("Starting speech recognition");
      SpeechRecognition.startListening({ continuous: true, language: "en-US" });
    } else {
      console.log("Stopping speech recognition", { isActive, listening, isProcessing });
      SpeechRecognition.stopListening();
    }
  }, [isActive, listening, isProcessing]);

  // Speak using native SpeechSynthesis
  const speakNative = useCallback((text: string) => {
    if (speechSupported && isMounted.current && isActive) {
      console.log("Speaking natively:", text);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => console.log("Speech ended:", text);
      utterance.onerror = (e) => console.error("Speech error:", e);
      window.speechSynthesis.speak(utterance);
    }
  }, [speechSupported, isActive]);

  // Handle stopping and processing the transcript
  const handleStop = useCallback(async () => {
    console.log("Handling stop and process");
    SpeechRecognition.stopListening();
    setIsProcessing(true);
    const userMessage = lastTranscript.current.trim();
    if (userMessage) {
      const updatedConversation = [
        ...conversation,
        { role: "user", content: userMessage },
      ];
      setConversation(updatedConversation);
      resetTranscript();
      lastTranscript.current = "";

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
        if (isActive && isMounted.current) {
          speakNative(aiResponse);
        }
      } catch (error) {
        console.error("Error with API:", error);
        const errorMessage = `Sorry, I couldn't process that. Please try again.`;
        setConversation([
          ...updatedConversation,
          { role: "assistant", content: errorMessage },
        ]);
        if (isActive && isMounted.current) {
          speakNative(errorMessage);
        }
      }
    }
    setIsProcessing(false);
    manageSpeechRecognition();
  }, [conversation, isActive, resetTranscript, manageSpeechRecognition, speakNative, persona.name]);

  // Initialize conversation
  useEffect(() => {
    console.log("Conversation useEffect ran", { isActive, personaName: persona.name });
    if (isActive && !hasGreeted.current) {
      const greeting = `Hi, I'm ${persona.name}! Do you have any questions about our product?`;
      setConversation([{ role: "assistant", content: greeting }]);
      hasGreeted.current = true;
      if (speechSupported) {
        speechTimeout.current = setTimeout(() => {
          if (isMounted.current && isActive) {
            speakNative(greeting);
          }
        }, 100);
      }
    } else if (!isActive) {
      setConversation([]);
      resetTranscript();
      lastTranscript.current = "";
      hasGreeted.current = false;
    }

    return () => {
      console.log("Conversation useEffect cleanup");
      if (speechTimeout.current) {
        clearTimeout(speechTimeout.current);
      }
    };
  }, [isActive, persona.name, speechSupported, resetTranscript, speakNative]);

  // Manage speech recognition
  useEffect(() => {
    console.log("Speech recognition useEffect ran", { isActive, listening, isProcessing });
    manageSpeechRecognition();
    return () => {
      console.log("Speech recognition useEffect cleanup");
      SpeechRecognition.stopListening();
    };
  }, [manageSpeechRecognition]);

  // Handle transcript updates
  useEffect(() => {
    if (transcript && transcript !== lastTranscript.current) {
      console.log("Transcript updated:", transcript);
      lastTranscript.current = transcript;
    }
  }, [transcript]);

  // Call onStop when isActive becomes false
  useEffect(() => {
    if (!isActive && isMounted.current) {
      console.log("Calling onStop due to isActive false");
      onStop();
    }
  }, [isActive, onStop]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      console.log("Unmounting VoiceAgent");
      isMounted.current = false;
      SpeechRecognition.stopListening();
      window.speechSynthesis.cancel();
      if (speechTimeout.current) {
        clearTimeout(speechTimeout.current);
      }
    };
  }, []);

  if (!speechSupported) {
    return (
      <p className="text-sm text-gray-500">
        Your browser does not support speech synthesis.
      </p>
    );
  }

  if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
    return (
      <p className="text-sm text-gray-500">
        Your browser does not support speech recognition.
      </p>
    );
  }

  return (
    <Card className="w-full max-h-[120px] overflow-y-auto bg-gray-900 border-gray-700">
      <CardContent className="p-2">
        {conversation.map((msg, idx) => (
          <p key={idx} className="text-sm mb-1 text-neutral-100">
            <strong
              className={
                msg.role === "assistant" ? "text-blue-400" : "text-green-400"
              }
            >
              {msg.role === "assistant" ? persona.name : "You"}:
            </strong>{" "}
            {msg.content}
          </p>
        ))}
        {isProcessing && <p className="text-sm text-gray-400">Processing...</p>}
        <Button
          onClick={handleStop}
          disabled={isProcessing || !lastTranscript.current}
          variant="outline"
          className="mt-2 w-full bg-gray-800 text-neutral-100 border-gray-600 hover:bg-gray-700"
        >
          <StopCircle className="w-4 h-4 mr-2" />
          {isProcessing ? "Processing..." : "Stop and Process"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default VoiceAgent;