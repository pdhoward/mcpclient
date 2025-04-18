import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Hooks
import { useTranscript } from '@/contexts/TranscriptContext';
import { useHandleServerEvent } from '@/hooks/useHandleServerEvent';
import { useMappedMessages } from '@/hooks/useMappedMessages';
import { useSessionManager } from '@/hooks/useSessionManager';
import { useMessageHandler } from '@/hooks/useMessageHandler';
import { useAgentSession } from '@/hooks/useAgentSession';
import { usePTTHandler } from '@/hooks/usePushToTalkHandler';

// Components
import { VoiceSelector } from '@/components/controls/select-voice';
import { ScenarioSelector } from '@/components/controls/select-scenario';
import { AgentSelector } from '@/components/controls/select-agent';
import { BroadcastButton } from '@/components/controls/broadcast-button';
import  AudioControls  from '@/components/controls/select-audiocontrols';
import { TokenUsageDisplay } from '@/components/controls/token-usage';
import { MessageControls } from '@/components/controls/message-controls';
import { TextInput } from '@/components/controls/text-input';
import { StatusDisplay } from '@/components/controls/status';
import { ToolsEducation } from '@/components/controls/tools-education';

// Configuration and types
import { allAgentSets, defaultAgentSetKey } from '@/config/agents';
import { AgentComponentProps, AgentConfig, SessionStatus } from '@/lib/types';

function MetaAgent({ activeAgent, setActiveAgent }: AgentComponentProps) {
  // State
  const [voice, setVoice] = useState("ash");
  const [selectedAgentName, setSelectedAgentName] = useState<string>("");
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] = useState<AgentConfig[] | null>(null);
  const [isPTTActive, setIsPTTActive] = useState<boolean>(false);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(true);
  const [userText, setUserText] = useState<string>("");  
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("DISCONNECTED");

  // Hooks
  const { transcriptItems } = useTranscript();
  const { logs, conversation } = useMappedMessages();

  // Session management
  const {
    connectionState,
    dataChannel,
    dcRef,
    connectToRealtime,
    disconnectFromRealtime
  } = useSessionManager({
    selectedAgentName,
    selectedAgentConfigSet,
    isAudioPlaybackEnabled,
    sessionStatus,
    setSessionStatus
  });

  // Message handling
  const {
    sendClientEvent,
    sendSimulatedUserMessage,
    cancelAssistantSpeech,
    handleSendTextMessage
  } = useMessageHandler({
    dcRef,
    sessionStatus
  });

  // Agent session
  const { updateSession } = useAgentSession({
    selectedAgentName,
    selectedAgentConfigSet,
    isPTTActive,
    sendClientEvent,
    sendSimulatedUserMessage
  });

  // PTT handling
  const {
    isPTTUserSpeaking,
    handleTalkButtonDown,
    handleTalkButtonUp
  } = usePTTHandler({
    sessionStatus,
    dataChannel,
    sendClientEvent,
    cancelAssistantSpeech
  });

  // Server event handling
  const handleServerEventRef = useHandleServerEvent({
    setSessionStatus,
    selectedAgentName,
    selectedAgentConfigSet,
    sendClientEvent,
    setSelectedAgentName,
  });

  useEffect(() => {
    if (dataChannel) {
      dataChannel.addEventListener("message", (e: MessageEvent) => {        
        handleServerEventRef.current(JSON.parse(e.data));
      });
    }
  }, [dataChannel]);

  // Initialize agent configuration
  useEffect(() => {
    let finalAgentConfig = activeAgent.api || defaultAgentSetKey;
    const agents = allAgentSets[finalAgentConfig];
    const agentKeyToUse = agents[0]?.name || "";

    setSelectedAgentName(agentKeyToUse);
    setSelectedAgentConfigSet(agents);
  }, [activeAgent.api]);

  // Connect to realtime when agent is selected
  useEffect(() => {
    if (selectedAgentName && sessionStatus === "DISCONNECTED") {
      connectToRealtime();
    }
  }, [selectedAgentName]);

  // Update session when connected
  useEffect(() => {
    if (
      sessionStatus === "CONNECTED" &&
      selectedAgentConfigSet &&
      selectedAgentName
    ) {
      updateSession(true);
    }
  }, [selectedAgentConfigSet, selectedAgentName, sessionStatus]);

  // Update session when PTT changes
  useEffect(() => {
    if (sessionStatus === "CONNECTED") {
      updateSession();
    }
  }, [isPTTActive]);

  // Local storage effects
  useEffect(() => {
    const storedPushToTalkUI = localStorage.getItem("pushToTalkUI");
    if (storedPushToTalkUI) {
      setIsPTTActive(storedPushToTalkUI === "true");
    }
    const storedAudioPlaybackEnabled = localStorage.getItem("audioPlaybackEnabled");
    if (storedAudioPlaybackEnabled) {
      setIsAudioPlaybackEnabled(storedAudioPlaybackEnabled === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pushToTalkUI", isPTTActive.toString());
  }, [isPTTActive]);

  useEffect(() => {
    localStorage.setItem(
      "audioPlaybackEnabled",
      isAudioPlaybackEnabled.toString()
    );
  }, [isAudioPlaybackEnabled]);

  // Event handlers
  const onToggleConnection = () => {    
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
      disconnectFromRealtime();
    } else {
      connectToRealtime();
    }
  };

  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveAgent({ ...activeAgent, api: e.target.value });
  };

  const handleSelectedAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAgentName(e.target.value);
  };

  const handleTextSubmit = () => {
    handleSendTextMessage(userText, transcriptItems);
    setUserText("");
  };

  return (
    <main className="h-full">
      <motion.div 
        className="container flex flex-col items-center justify-center mx-auto max-w-3xl my-2 sm:my-4 p-4 sm:p-12 border rounded-lg shadow-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >         
        <motion.div 
          className="w-full max-w-md bg-card text-card-foreground rounded-xl border shadow-sm p-4 sm:p-6 space-y-3 sm:space-y-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <VoiceSelector value={voice} onValueChange={setVoice} />
          <ScenarioSelector 
            value={activeAgent.api || defaultAgentSetKey} 
            onValueChange={(value) => handleAgentChange({ target: { value } } as React.ChangeEvent<HTMLSelectElement>)} 
          />
          {selectedAgentConfigSet && (
            <AgentSelector 
              value={selectedAgentName} 
              onValueChange={(value) => handleSelectedAgentChange({ target: { value } } as React.ChangeEvent<HTMLSelectElement>)} 
              options={selectedAgentConfigSet.map(agent => ({ label: agent.name, value: agent.name }))} 
              label="Select an agent"
            />            
          )}         
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <BroadcastButton 
              isSessionActive={sessionStatus === "CONNECTED"} 
              onClick={onToggleConnection}
            />
            <div className="flex flex-col items-center">
              <AudioControls 
                sessionStatus={sessionStatus}            
                isPTTActive={isPTTActive}
                setIsPTTActive={setIsPTTActive}
                isPTTUserSpeaking={isPTTUserSpeaking}
                handleTalkButtonDown={() => handleTalkButtonDown(transcriptItems)}
                handleTalkButtonUp={handleTalkButtonUp} 
                isAudioPlaybackEnabled={isAudioPlaybackEnabled}
                setIsAudioPlaybackEnabled={setIsAudioPlaybackEnabled}
              />
            </div>
          </div>
          {logs.length > 4 && <TokenUsageDisplay messages={logs} />}
          {connectionState && (
            <motion.div 
              className="w-full flex flex-col gap-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <MessageControls 
                conversation={conversation} 
                msgs={[]}
              />
              <TextInput 
                value={userText} 
                onChange={setUserText} 
                onSubmit={handleTextSubmit}
                disabled={sessionStatus !== "CONNECTED"}
              />
            </motion.div>
          )}
        </motion.div>
        
        {connectionState && <StatusDisplay status={connectionState} />}
        <div className="w-full flex flex-col items-center gap-4">
          <ToolsEducation />
        </div>
      </motion.div>
    </main>
  );
}

export default MetaAgent;