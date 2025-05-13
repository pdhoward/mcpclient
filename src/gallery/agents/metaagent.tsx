'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import WaveSurfer from 'wavesurfer.js';
import IPhoneModal from '@/components/modal/iphone-modal';

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
    const response = await fetch(`/api/mcp/agentconfigurator?api=${encodeURIComponent(agent)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to fetch agent config');
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
  const [isPTTActive, setIsPTTActive] = useState<boolean>(false);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(true);
  const [userText, setUserText] = useState<string>('');
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('DISCONNECTED');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [showTranscription, setShowTranscription] = useState<boolean>(true);
  const [timer, setTimer] = useState<number>(0);

  // Waveform
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  // Hooks
  const { transcriptItems } = useTranscript();
  const { logs: messageLogs, conversation } = useMappedMessages();
  const { connectionState, dataChannel, dcRef, connectToRealtime, disconnectFromRealtime } =
    useSessionManager({
      selectedAgentName,
      selectedAgentConfigSet,
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
  const handleServerEventRef = useHandleServerEvent({
    setSessionStatus,
    selectedAgentName,
    selectedAgentConfigSet,
    sendClientEvent,
    setSelectedAgentName,
  });

  // Transform messageLogs (Message[]) to TranscriptItem[]
  const logs: TranscriptItem[] = messageLogs.map((message: Message) => ({
    itemId: message.id,
    type: "MESSAGE" as const,
    role: message.role,
    data: { text: message.content },
    expanded: false,
    timestamp: new Date(message.timestamp).toISOString(),
    createdAtMs: message.timestamp,
    status: "DONE" as const,
    isHidden: false,
  }));

  // Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (sessionStatus === 'CONNECTED') {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
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

  // Waveform Setup
  useEffect(() => {
    if (waveformRef.current && !wavesurferRef.current) {
      wavesurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#4CAF50',
        progressColor: '#2A5298',
        cursorColor: '#fff',
        barWidth: 3,
        barGap: 1,
        height: 60,
        hideScrollbar: true,
        normalize: true,
      });

      wavesurferRef.current.load('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');

      wavesurferRef.current.on('ready', () => {
        if (sessionStatus === 'CONNECTED' && !isMuted) {
          wavesurferRef.current?.play();
        }
      });
    }

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [sessionStatus, isMuted]);

  // Mute/Unmute Logic
  const toggleMute = () => {
    if (wavesurferRef.current) {
      if (isMuted) {
        wavesurferRef.current.play();
      } else {
        wavesurferRef.current.pause();
      }
      setIsMuted(!isMuted);
    }
  };

  // Event Listeners for Tool Calls
  useEffect(() => {
    if (dataChannel) {
      const handleMessage = (e: MessageEvent) => {
        const event = JSON.parse(e.data);
        console.log('Received event from OpenAI Live:', event);
        if (event.type === 'tool-call') {
          const { toolName, args } = event;
          const agentConfig = selectedAgentConfigSet?.find(
            (config) => config.name === selectedAgentName
          );
          const toolLogic = agentConfig?.toolLogic?.[toolName];
          if (toolLogic) {
            console.log(`Handling tool-call for ${toolName} with args:`, args);
            toolLogic(args, transcriptItems).then((result: any) => {
              console.log(`Tool ${toolName} executed, result:`, result);
              sendClientEvent({
                type: 'tool-result',
                toolName,
                result,
              });
            }).catch((error: any) => {
              console.error(`Error executing tool ${toolName}:`, error);
              sendClientEvent({
                type: 'tool-result',
                toolName,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify({ error: error.message }),
                    },
                  ],
                },
              });
            });
          } else {
            console.error(`No toolLogic found for tool ${toolName}`);
            sendClientEvent({
              type: 'tool-result',
              toolName,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({ error: `No toolLogic found for tool ${toolName}` }),
                  },
                ],
              },
            });
          }
        }
        handleServerEventRef.current(event);
      };
      dataChannel.addEventListener('message', handleMessage);
      return () => dataChannel.removeEventListener('message', handleMessage);
    }
  }, [dataChannel, selectedAgentConfigSet, selectedAgentName, transcriptItems]);

  useEffect(() => {
    if (activeAgent?.name) {
      fetchAgentConfig(activeAgent.name).then((agents) => {
        console.log('Fetched AgentConfig:', JSON.stringify(agents, null, 2));
        const agentKeyToUse = agents[0]?.name || '';
        setSelectedAgentName(agentKeyToUse);
        setSelectedAgentConfigSet(agents);
      });
    } else {
      setSelectedAgentName('');
      setSelectedAgentConfigSet(null);
    }
  }, [activeAgent?.name]);

  useEffect(() => {
    if (selectedAgentName && sessionStatus === 'DISCONNECTED') {
      console.log('Initiating connection to OpenAI Live for agent:', selectedAgentName);
      connectToRealtime();
      setIsCallActive(true);
    }
  }, [selectedAgentName, sessionStatus]);

  useEffect(() => {
    if (sessionStatus === 'CONNECTED' && selectedAgentConfigSet && selectedAgentName) {
      console.log('Sending AgentConfig to OpenAI Live:', JSON.stringify(selectedAgentConfigSet, null, 2));
      updateSession(true);
    }
  }, [selectedAgentConfigSet, selectedAgentName, sessionStatus]);

  useEffect(() => {
    if (sessionStatus === 'CONNECTED') {
      console.log('Updating session with PTT state:', isPTTActive);
      updateSession();
    }
  }, [isPTTActive]);

  useEffect(() => {
    const storedPushToTalkUI = localStorage.getItem('pushToTalkUI');
    if (storedPushToTalkUI) {
      setIsPTTActive(storedPushToTalkUI === 'true');
    }
    const storedAudioPlaybackEnabled = localStorage.getItem('audioPlaybackEnabled');
    if (storedAudioPlaybackEnabled) {
      setIsAudioPlaybackEnabled(storedAudioPlaybackEnabled === 'true');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pushToTalkUI', isPTTActive.toString());
  }, [isPTTActive]);

  useEffect(() => {
    localStorage.setItem('audioPlaybackEnabled', isAudioPlaybackEnabled.toString());
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    if (voice) {
      setVoice(voice);
    }
  }, [voice]);

  // Event Handlers
  const onToggleConnection = () => {
    if (sessionStatus === 'CONNECTED' || sessionStatus === 'CONNECTING') {
      console.log('Disconnecting from OpenAI Live');
      disconnectFromRealtime();
      if (wavesurferRef.current) {
        wavesurferRef.current.stop();
      }
      setIsCallActive(false);
    } else {
      console.log('Connecting to OpenAI Live');
      connectToRealtime();
      setIsCallActive(true);
    }
  };

  const handleTextSubmit = (text: string) => {
    console.log('Sending text message:', text);
    handleSendTextMessage(text, transcriptItems);
    setUserText('');
  };

  const handleToggleTranscription = () => {
    setShowTranscription(!showTranscription);
  };

  const handleClose = () => {
    console.log('Closing MetaAgent and disconnecting');
    disconnectFromRealtime();
    setActiveAgent(null);
  };

  // Auto-scroll to the latest message
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptItems]);

  return (
    <IPhoneModal
      isOpen={true} // Always open since MetaAgent is rendered when selected
      onClose={handleClose}
      onStartCall={onToggleConnection}
      onEndCall={onToggleConnection}
      onMute={toggleMute}
      isMuted={isMuted}
      isCallActive={isCallActive}
      onSendText={handleTextSubmit}
      onToggleTranscription={handleToggleTranscription}
      showTranscription={showTranscription}
      logs={logs}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-neutral-200">
            {selectedAgentName || 'Voice Agent'}
          </h3>
          <span className="text-sm text-neutral-400">{formatTime(timer)}</span>
        </div>

        {/* Waveform */}
        <div
          ref={waveformRef}
          className="w-full h-20 rounded-lg bg-neutral-800 overflow-hidden mb-4 relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neutral-700 to-transparent opacity-30" />
        </div>

        {/* Transcription Area */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {showTranscription ? (
            transcriptItems
              .filter((item) => item.type === 'MESSAGE' && !item.isHidden)
              .map((item, index) => (
                <div
                  key={index}
                  className={`flex ${
                    item.role === 'user'
                      ? 'justify-end'
                      : item.role === 'assistant'
                      ? 'justify-start'
                      : 'justify-center'
                  }`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-2xl ${
                      item.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : item.role === 'assistant'
                        ? 'bg-neutral-700 text-neutral-200'
                        : 'bg-neutral-600 text-neutral-300'
                    }`}
                  >
                    <p className="text-sm">{item.data?.text ?? 'No message content'}</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-400">
              Transcription Hidden
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Status */}
        {connectionState && (
          <div className="text-sm text-neutral-400 text-center mb-4">
            Status: {connectionState}
          </div>
        )}
      </div>
    </IPhoneModal>
  );
}

export default MetaAgent;