'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import WaveSurfer from 'wavesurfer.js';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

// Hooks
import { useTranscript } from '@/contexts/TranscriptContext';
import { useHandleServerEvent } from '@/hooks/useHandleServerEvent';
import { useMappedMessages } from '@/hooks/useMappedMessages';
import { useSessionManager } from '@/hooks/useSessionManager';
import { useMessageHandler } from '@/hooks/useMessageHandler';
import { useAgentSession } from '@/hooks/useAgentSession';
import { usePTTHandler } from '@/hooks/usePushToTalkHandler';

// Types
import { AgentComponentProps, AgentConfig, SessionStatus } from '@/lib/types';

interface MetaAgentProps extends AgentComponentProps {
  voice?: string;
  onStartCall?: () => void;
  onEndCall?: () => void;
  onMute?: () => void;
  onSendText?: (text: string) => void;
  onToggleTranscription?: () => void;
}

function MetaAgent({
  activeAgent,
  setActiveAgent,
  voice,
  onStartCall,
  onEndCall,
  onMute,
  onSendText,
  onToggleTranscription,
}: MetaAgentProps) {
  // State
  const [voiceState, setVoice] = useState(voice || 'ash');
  const [selectedAgentName, setSelectedAgentName] = useState<string>('');
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] = useState<AgentConfig[] | null>(null);
  const [isPTTActive, setIsPTTActive] = useState<boolean>(false);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(true);
  const [userText, setUserText] = useState<string>('');
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('DISCONNECTED');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [timer, setTimer] = useState<number>(0);
  const [showTranscription, setShowTranscription] = useState(true);

  // Waveform
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  // Hooks
  const { transcriptItems } = useTranscript();
  const { logs, conversation } = useMappedMessages();
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
      if (onMute) onMute();
    }
  };

  // Event Listeners
  useEffect(() => {
    if (dataChannel) {
      const handleMessage = (e: MessageEvent) => {
        handleServerEventRef.current(JSON.parse(e.data));
      };
      dataChannel.addEventListener('message', handleMessage);
      return () => dataChannel.removeEventListener('message', handleMessage);
    }
  }, [dataChannel]);

  useEffect(() => {
    if (activeAgent?.name) {
      fetchAgentConfig(activeAgent.name).then((agents) => {
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
      connectToRealtime();
      if (onStartCall) onStartCall();
    }
  }, [selectedAgentName]);

  useEffect(() => {
    if (sessionStatus === 'CONNECTED' && selectedAgentConfigSet && selectedAgentName) {
      updateSession(true);
    }
  }, [selectedAgentConfigSet, selectedAgentName, sessionStatus]);

  useEffect(() => {
    if (sessionStatus === 'CONNECTED') {
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
      disconnectFromRealtime();
      if (wavesurferRef.current) {
        wavesurferRef.current.stop();
      }
      if (onEndCall) onEndCall();
    } else {
      connectToRealtime();
      if (onStartCall) onStartCall();
    }
  };

  const handleTextSubmit = (text: string) => {
    handleSendTextMessage(text, transcriptItems);
    if (onSendText) onSendText(text);
  };

  const handleToggleTranscription = () => {
    setShowTranscription(!showTranscription);
    if (onToggleTranscription) onToggleTranscription();
  };

  // Auto-scroll to the latest message
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptItems]);

  return (
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

      {/* Additional Features */}
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" disabled>
          Select Voice (Coming Soon)
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">System Logs</Button>
          </DialogTrigger>
          <DialogContent className="bg-neutral-900 text-neutral-200 border-neutral-800">
            <DialogHeader>
              <DialogTitle>System Logs</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-neutral-400">
              {logs.length > 0 ? (
                logs.map((log, index) => <p key={index}>{log.data?.text ?? 'No log content'}</p>)
              ) : (
                <p>No logs available.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status */}
      {connectionState && (
        <div className="text-sm text-neutral-400 text-center mb-4">
          Status: {connectionState}
        </div>
      )}
    </div>
  );
}

export default MetaAgent;