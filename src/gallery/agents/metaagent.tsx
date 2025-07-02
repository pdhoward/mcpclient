'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import IPhoneModal from '@/components/modal/iphone-modal';
import VisualStage from '@/components/VisualStage';
import {motion} from "framer-motion"

// Hooks
import { useTranscript } from '@/contexts/TranscriptContext';
import { useHandleServerEvent } from '@/hooks/useHandleServerEvent';
import { useMappedMessages } from '@/hooks/useMappedMessages';
import { useSessionManager } from '@/hooks/useSessionManager';
import { useMessageHandler } from '@/hooks/useMessageHandler';
import { useAgentSession } from '@/hooks/useAgentSession';
import { usePTTHandler } from '@/hooks/usePushToTalkHandler';

// Types
import { AgentComponentProps, AgentConfig, SessionStatus, TranscriptItem, Message } from '@/lib/types';

interface MetaAgentProps extends AgentComponentProps {
  voice?: string;
}

async function fetchAgentConfig(agent: string): Promise<AgentConfig[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort('Fetch timed out'), 30000);
    const response = await fetch(`/api/mcp/agentconfigurator?api=${encodeURIComponent(agent)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`Failed to fetch agent config: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching agent config:', error);
    return [];
  }
}

function MetaAgent({ activeAgent, setActiveAgent, voice }: MetaAgentProps) {
  // State
  const [voiceState, setVoice] = useState(voice || 'ash');
  const [selectedAgentName, setSelectedAgentName] = useState<string>('');
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] = useState<AgentConfig[] | null>(null);
  const [hasFetchedConfig, setHasFetchedConfig] = useState<string | null>(null);
  const [isPTTActive, setIsPTTActive] = useState<boolean>(false);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(true);
  const [userText, setUserText] = useState<string>('');
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('DISCONNECTED');
  const [userDisconnected, setUserDisconnected] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [showTranscription, setShowTranscription] = useState<boolean>(true);
  const [timer, setTimer] = useState<number>(0);

  // Hooks
  const router = useRouter();
  const { transcriptItems } = useTranscript();
  const { logs: messageLogs, conversation } = useMappedMessages();
  const { connectionState, dataChannel, dcRef, connectToRealtime, disconnectFromRealtime, audioElement } =
    useSessionManager({
      isAudioPlaybackEnabled,
      sessionStatus,
      setSessionStatus,
    });
  const { sendClientEvent, sendSimulatedUserMessage, cancelAssistantSpeech, handleSendTextMessage } =
    useMessageHandler({ dcRef, sessionStatus });
  const { updateSession } = useAgentSession({
    selectedAgentName,
    selectedAgentConfigSet,
    isPTTActive,
    sendClientEvent,
    sendSimulatedUserMessage,
  });
  const { isPTTUserSpeaking, handleTalkButtonDown, handleTalkButtonUp } = usePTTHandler({
    sessionStatus,
    dataChannel,
    sendClientEvent,
    cancelAssistantSpeech,
  });

  /* //////////////////////////////////////////////////////////
   note that this EventRef pattern ensures more efficient
   processing vs a pure function. Changes to dependencies will
   update function in .current without rerender
  */

  const handleServerEventRef = useHandleServerEvent({
    setSessionStatus,
    selectedAgentName,
    selectedAgentConfigSet,
    sendClientEvent,
    setSelectedAgentName,
  });

  // Auto-scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Transform messageLogs to TranscriptItem[]
  const logs: TranscriptItem[] = messageLogs.map((message: Message) => {
    const timestampValue = typeof message.timestamp === 'number' && !isNaN(message.timestamp)
      ? message.timestamp
      : Date.now(); // Fallback to current timestamp if invalid or null

    return {
      itemId: message.id,
      type: "MESSAGE" as const,
      role: message.role === 'system' ? undefined : message.role,
      data: { text: message.content || message.text || 'No content' },
      expanded: false,
      timestamp: new Date(timestampValue).toISOString(),
      createdAtMs: timestampValue,
      status: "DONE" as const,
      isHidden: false,
    };
  });

  // Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (sessionStatus === 'CONNECTED') {
      interval = setInterval(() => setTimer((prev) => prev + 1), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
      setTimer(0);
    };
  }, [sessionStatus]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Mute/Unmute Logic
  const toggleMute = () => {
    if (audioElement) {
      audioElement.muted = !audioElement.muted;
      setIsMuted(audioElement.muted);
    }
  };

  // Handle Server Events
  useEffect(() => {
    if (dataChannel) {
      const handleMessage = async (e: MessageEvent) => {
        const event = JSON.parse(e.data);
        console.log('Received event:', event);
        if (event.type === 'error') console.error('WebRTC error:', event);
        handleServerEventRef.current(event);
      };
      dataChannel.addEventListener('message', handleMessage);
      return () => dataChannel.removeEventListener('message', handleMessage);
    }
  }, [dataChannel]);

  // Fetch Agent Config
  useEffect(() => {
    if (activeAgent?.name && activeAgent.name !== hasFetchedConfig) {
      fetchAgentConfig(activeAgent.name).then((agents) => {
        setSelectedAgentName(agents[0]?.name || '');
        setSelectedAgentConfigSet(agents);
        setHasFetchedConfig(activeAgent.name);
        setUserDisconnected(false);
      });
    } else if (!activeAgent?.name) {
      setSelectedAgentName('');
      setSelectedAgentConfigSet(null);
      setHasFetchedConfig(null);
    }
  }, [activeAgent?.name]);

  // Connect to Realtime
  useEffect(() => {
    if (selectedAgentName && sessionStatus === 'DISCONNECTED' && !userDisconnected) {
      connectToRealtime();
      setIsCallActive(true);
    }
  }, [selectedAgentName, sessionStatus, userDisconnected]);

  // Update Session
  useEffect(() => {
    if (sessionStatus === 'CONNECTED' && selectedAgentConfigSet && selectedAgentName) {
      updateSession(true);
    }
  }, [selectedAgentConfigSet, selectedAgentName, sessionStatus]);

  useEffect(() => {
    if (sessionStatus === 'CONNECTED') updateSession();
  }, [isPTTActive]);

  // Persist Settings
  useEffect(() => {
    localStorage.setItem('pushToTalkUI', isPTTActive.toString());
    localStorage.setItem('audioPlaybackEnabled', isAudioPlaybackEnabled.toString());
  }, [isPTTActive, isAudioPlaybackEnabled]);

  useEffect(() => {
    if (voice) setVoice(voice);
  }, [voice]);

  // Intent Detection via Transcript
  useEffect(() => {
    const latestUserMessage = transcriptItems
      .filter((item) => item.role === 'user' && item.type === 'MESSAGE')
      .slice(-1)[0];
    if (latestUserMessage?.data?.text) {
      const text = latestUserMessage.data.text.toLowerCase();
      if (text.includes('show the room') || text.includes('see the unit')) {
        router.push('/components/room');
      } else if (text.includes('view the menu') || text.includes('see the menu')) {
        router.push('/components/menu');
      } else if (text.includes('billing summary') || text.includes('show billing')) {
        router.push('/components/billing');
      } else if (text.includes('site plan') || text.includes('show site')) {
        router.push('/components/siteplan');
      }
    }
  }, [transcriptItems, router]);

    // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptItems]);

  // Debug transcriptItems
  useEffect(() => {
    console.log('Transcript Items:', transcriptItems);
  }, [transcriptItems]);

  // Event Handlers
  const onToggleConnection = () => {
    if (sessionStatus === 'CONNECTED' || sessionStatus === 'CONNECTING') {
      disconnectFromRealtime();
      setIsCallActive(false);
      setUserDisconnected(true);
    } else {
      connectToRealtime();
      setIsCallActive(true);
      setUserDisconnected(false);
    }
  };

  const handleTextSubmit = (text: string) => {
    handleSendTextMessage(text, transcriptItems);
    setUserText('');
  };

  const handleToggleTranscription = () => {
    setShowTranscription(!showTranscription);
  };

  const handleEndSession = () => {
    setSelectedAgentName('');
    setSelectedAgentConfigSet(null);
    setHasFetchedConfig(null);
    setUserDisconnected(true);
    setActiveAgent(null);
    setIsCallActive(false);
    router.push('/'); // Reset to home
  };

  const handleClose = () => {
    setSelectedAgentName('');
    setSelectedAgentConfigSet(null);
    setHasFetchedConfig(null);
    setUserDisconnected(true);
    setActiveAgent(null);
    setIsCallActive(false);
    disconnectFromRealtime();
    router.push('/');
  };

    // Render nothing if no active agent (handled by homepage elsewhere)
  if (!activeAgent) return null;

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col">
      {/* Header with Gradient */}
      <header className="bg-gradient-to-r from-neutral-800 to-neutral-700 p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Cypress Resorts" className="h-8" /> {/* Add logo to public/ */}
          <h1 className="text-xl font-semibold text-neutral-200">Cypress Resorts</h1>
          <h1 className="text-xl font-semibold text-neutral-200">Cypress Resorts</h1>
        </div>
        <span className="text-sm text-neutral-400">Luxury Awaits</span>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4">
        {/* Left Side: VisualStage */}
        <div className="flex-1 md:w-2/3 bg-neutral-800 rounded-lg shadow-lg p-4 overflow-y-auto">
          <VisualStage />
        </div>

        {/* Right Side: IPhoneModal */}
        <div className="md:w-1/3 flex justify-center">
          <IPhoneModal
            isOpen={!!activeAgent}
            onClose={handleClose}
            onStartCall={onToggleConnection}
            onEndCall={onToggleConnection}
            onEndSession={handleEndSession}
            onMute={toggleMute}
            isMuted={isMuted}
            isCallActive={isCallActive}
            onSendText={handleTextSubmit}
            onToggleTranscription={handleToggleTranscription}
            showTranscription={showTranscription}
            logs={logs}
            transcriptItems={transcriptItems}
          >
            <div className="h-full flex flex-col text-neutral-200">
              {/* Header */}
              <div className="flex justify-between items-center mb-2 px-3">
                <h3 className="text-sm font-semibold">{selectedAgentName || 'Cypress Resorts'}</h3>
                <span className="text-xs">{formatTime(timer)}</span>
              </div>

              {/* Transcription Area */}
               <div className="flex-1 overflow-y-auto space-y-2 mb-4 no-scrollbar">
                {showTranscription ? (
                  transcriptItems
                    .filter((item) => item.type === 'MESSAGE' && !item.isHidden)
                    .map((item, index) => (
                      <motion.div
                        key={index}
                        className={`flex relative ${
                          item.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div
                          className={`relative max-w-[70%] p-2 rounded-2xl shadow-sm ${
                            item.role === 'user'
                              ? 'bg-blue-600 text-white pr-3 after:content-[""] after:absolute after:bottom-0 after:right-[-6px] after:border-[6px] after:border-transparent after:border-l-blue-600 after:border-b-blue-600'
                              : 'bg-neutral-700 text-neutral-200 pl-3 after:content-[""] after:absolute after:bottom-0 after:left-[-6px] after:border-[6px] after:border-transparent after:border-r-neutral-700 after:border-b-neutral-700'
                          }`}
                        >
                          <p className="text-xs">{item.title ?? 'No message content'}</p>
                          <p className="text-[8px] text-neutral-400 mt-1">
                            {item.timestamp}
                          </p>
                        </div>
                      </motion.div>
                    ))
                ) : (
                  <div className="flex items-center justify-center h-full text-neutral-400 text-xs">
                    Transcription Hidden
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Text Input */}
              <div className="p-3 border-t border-neutral-800">
                <input
                  type="text"
                  value={userText}
                  onChange={(e) => setUserText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit(userText)}
                  placeholder="Type a message..."
                  className="w-full p-1.5 bg-neutral-800 text-neutral-200 text-xs rounded-lg border border-neutral-700 focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
              </div>

              {/* Status */}
              {connectionState && (
                <div className="text-xs text-neutral-400 text-center p-2">
                  Status: {connectionState}
                </div>
              )}
            </div>
          </IPhoneModal>
        </div>
      </div>
    </div>
  );
}

export default MetaAgent;