'use client';
import React, { useState, useEffect, useRef } from 'react';
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

let x = 0

async function fetchAgentConfig(agent: string): Promise<AgentConfig[]> {
  console.log(`-----------debug fetch agent config --------`)
  x++
  console.log(`fetch config for ${agent} for the time #${x}`)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort('Fetch timed out after 30 seconds');
    }, 30000);

    const response = await fetch(`/api/mcp/agentconfigurator?api=${encodeURIComponent(agent)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch agent config: ${response.status} - ${errorText}`);
    }
    const data = await response.json();  
    console.log(`-----agent configuration----`)  
    console.log(data)
    return data;
  } catch (error: any) {
    console.error('Error fetching agent config:', error.message, error);
    return [];
  }
}

function MetaAgent({ activeAgent, setActiveAgent, voice }: MetaAgentProps) {
  // State
  const [voiceState, setVoice] = useState(voice || 'ash');
  const [selectedAgentName, setSelectedAgentName] = useState<string>('');
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] = useState<AgentConfig[] | null>(null);
  const [hasFetchedConfig, setHasFetchedConfig] = useState<string | null>(null); // Track fetched agent name
  const [isPTTActive, setIsPTTActive] = useState<boolean>(false);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(true);
  const [userText, setUserText] = useState<string>('');
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('DISCONNECTED');
  const [userDisconnected, setUserDisconnected] = useState<boolean>(false); // track user action on connections
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [showTranscription, setShowTranscription] = useState<boolean>(true);
  const [timer, setTimer] = useState<number>(0);

  // Hooks
  const { transcriptItems } = useTranscript();
  const { logs: messageLogs, conversation } = useMappedMessages();
  const { connectionState, dataChannel, dcRef, connectToRealtime, disconnectFromRealtime, audioElement } =
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

  // Mute/Unmute Logic
  const toggleMute = () => {
    if (audioElement) {
      audioElement.muted = !audioElement.muted;
      setIsMuted(audioElement.muted);
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

  ///////////////////////////////////////////////
  ///  action when new agent selected       ////
  /////////////////////////////////////////////

   useEffect(() => {   
    if (activeAgent?.name && activeAgent.name !== hasFetchedConfig) {
      console.log('Fetching AgentConfig for:', activeAgent.name);
      fetchAgentConfig(activeAgent.name).then((agents) => {
        console.log('Fetched AgentConfig:', JSON.stringify(agents, null, 2));
        const agentKeyToUse = agents[0]?.name || '';
        setSelectedAgentName(agentKeyToUse);
        setSelectedAgentConfigSet(agents);
        setHasFetchedConfig(activeAgent.name); // Mark as fetched
        setUserDisconnected(false); // Allow auto-connection
      });
    } else if (!activeAgent?.name) {
      setSelectedAgentName('');
      setSelectedAgentConfigSet(null);
      setHasFetchedConfig(null);
    }
  }, [activeAgent?.name]);

  //////////////////////////////////////////////////////
  ///  initiating connection for selected agent    ////
  // note - logic prevents reconnect on status alone /
  ///////////////////////////////////////////////////

  useEffect(() => {
    if (
      selectedAgentName && 
      sessionStatus === 'DISCONNECTED' &&
      !userDisconnected
    ) {
      console.log('Initiating connection to OpenAI Live for agent:', selectedAgentName);
      connectToRealtime();
      setIsCallActive(true);
    }
  }, [selectedAgentName, sessionStatus, userDisconnected]);

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
      setIsCallActive(false);
      setUserDisconnected(true);     
    } else {
      console.log('Connecting to OpenAI Live');
      connectToRealtime();
      setIsCallActive(true);
      setUserDisconnected(false); // Allow reconnection
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

   //////////////////////////////////////////////////////////
   ////   actions to end session and close iphone    ////////
  ////////////////////////////////////////////////////////

  const handleEndSession = () => {   
    setSelectedAgentName(''); // Clear agent name to prevent reconnection
    setSelectedAgentConfigSet(null); // Clear config to prevent reconnection
    setHasFetchedConfig(null); // Reset fetched config
    setUserDisconnected(true); // Prevent reconnection
    setActiveAgent(null); // Clear agent to close modal
    setIsCallActive(false); // Ensure UI reflects call ended    
  };

  const handleClose = () => {
    setSelectedAgentName('');
    setSelectedAgentConfigSet(null);
    setHasFetchedConfig(null);
    setUserDisconnected(true);
    setActiveAgent(null);
    setIsCallActive(false);
    disconnectFromRealtime();
  };

  // Auto-scroll to the latest message
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptItems]);

  return (
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
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-neutral-200">
            {selectedAgentName || 'Voice Agent'}
          </h3>
          <span className="text-sm text-neutral-400">{formatTime(timer)}</span>
        </div>       

        {/* Transcription Area */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4 no-scrollbar">
          {showTranscription ? (
            transcriptItems
              .filter((item) => item.type === 'MESSAGE' && !item.isHidden)
              .map((item, index) => (
                <div
                  key={index}
                  className={`flex relative ${
                    item.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`relative max-w-[70%] p-3 rounded-3xl shawdow-sm ${
                      item.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-neutral-700 text-neutral-200'
                    } ${
                      item.role === 'user'
                        ? 'pr-4 after:content-[""] after:absolute after:bottom-0 after:right-[-6px] after:border-[6px] after:border-transparent after:border-l-blue-600 after:border-b-blue-600'
                        : 'pl-4 after:content-[""] after:absolute after:bottom-0 after:left-[-6px] after:border-[6px] after:border-transparent after:border-r-neutral-700 after:border-b-neutral-700'
                    }`}
                  >
                    <p className="text-xs">{item.title ?? 'No message content'}</p>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      {item.timestamp}
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