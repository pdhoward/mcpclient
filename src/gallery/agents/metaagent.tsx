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

async function fetchAgentConfig(agent: string): Promise<AgentConfig[]> {
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

  // Waveform
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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

  // Real-Time Waveform Visualization
  useEffect(() => {
    if (!canvasRef.current || !audioElement) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    // Set canvas dimensions
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Initialize Web Audio API only once
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;

      // Connect audio element to analyser
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioElement);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }

    const bufferLength = analyserRef.current!.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvasCtx || !analyserRef.current) return;

      analyserRef.current!.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = 'rgb(51, 65, 85)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = '#4CAF50';
      canvasCtx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [audioElement]); // Only depend on audioElement

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
    console.log(`-----debug restart line 298 -----`)
    console.log(`for agent ${JSON.stringify(activeAgent, null, 2)}`) 
    console.log(`selected agent name value is ${selectedAgentName}`)
    console.log(`selected agent config set is ${selectedAgentConfigSet}`)
    console.log(`has fetched config value is ${hasFetchedConfig}`)
    console.log(`user disconnected value is ${userDisconnected}`)
    console.log(`is call active value is ${isCallActive}`)   
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
    console.log('closing iPhone ');   
    console.log(`for agent ${JSON.stringify(activeAgent, null, 2)}`) 
    setSelectedAgentName(''); // Clear agent name to prevent reconnection
    setSelectedAgentConfigSet(null); // Clear config to prevent reconnection
    setHasFetchedConfig(null); // Reset fetched config
    setUserDisconnected(true); // Prevent reconnection
    setActiveAgent(null); // Clear agent to close modal
    setIsCallActive(false); // Ensure UI reflects call ended
    //disconnectFromRealtime();
    console.log('handleEndSession completed');  
  };

  const handleClose = () => {
    console.log('Closing MetaAgent and disconnecting');
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
        <canvas
          ref={canvasRef}
          className="w-full h-20 rounded-lg bg-neutral-800 overflow-hidden mb-4 relative"
        />

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