/**
 * Hook to manage the WebRTC session state and connections
 */
import { useRef, useEffect, useState } from 'react';
import { createRealtimeConnection } from './realtimeConnection';
import { useTranscript } from '@/contexts/TranscriptContext';
import { useEvent } from '@/contexts/EventContext';
import { SessionStatus, AgentConfig } from '@/lib/types';

interface UseSessionManagerProps {
  selectedAgentName: string;
  selectedAgentConfigSet: AgentConfig[] | null;
  isAudioPlaybackEnabled: boolean;
  sessionStatus: SessionStatus;
  setSessionStatus: (status: SessionStatus) => void;
}

export function useSessionManager({
  selectedAgentName,
  selectedAgentConfigSet,
  isAudioPlaybackEnabled,
  sessionStatus,
  setSessionStatus,
}: UseSessionManagerProps) {
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const [connectionState, setConnectionState] = useState<string>("disconnected");

  const { logClientEvent, logServerEvent } = useEvent();
  const { addTranscriptBreadcrumb } = useTranscript();

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Fetch session token
  const fetchEphemeralKey = async (): Promise<string | null> => {
    logClientEvent({ url: "/session" }, "fetch_session_token_request");
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error(`Failed to get session token: ${response.status}`);
      }
      const data = await response.json();
      logServerEvent(data, "fetch_session_token_response");

      if (!data.client_secret?.value) {
        logClientEvent(data, "error.no_ephemeral_key");
        console.error("No session key provided by the server");
        setSessionStatus("DISCONNECTED");
        return null;
      }

      return data.client_secret.value;
    } catch (err) {
      throw new Error(`getEphemeralToken error: ${err}`);
    }
  };

  //////////////////////////////////////////
  //      REALTIME SERVICE CONNECTION   ///
  //  NOTE - SESSION SET TO CONNECTED   //
  //   WHEN DC CONFIRMED AS OPEN       //
  //////////////////////////////////////
  const connectToRealtime = async () => {
    if (sessionStatus !== "DISCONNECTED") return;
    setSessionStatus("CONNECTING");
    console.log('Connecting to OpenAI Live...');

    try {
      const EPHEMERAL_KEY = await fetchEphemeralKey();
      if (!EPHEMERAL_KEY) {
        return;
      }

      if (!audioElementRef.current) {
        audioElementRef.current = document.createElement("audio");
        document.body.appendChild(audioElementRef.current);
      }
      audioElementRef.current.autoplay = isAudioPlaybackEnabled;

      const { pc, dc } = await createRealtimeConnection(EPHEMERAL_KEY, audioElementRef);
      pcRef.current = pc;
      dcRef.current = dc;

      // ✅ Create remote audio stream from receivers
      const remoteStream = new MediaStream();
      pc.getReceivers().forEach(receiver => {
        if (receiver.track.kind === 'audio') {
          remoteStream.addTrack(receiver.track);
        }
      });
      audioElementRef.current.srcObject = remoteStream;

      // ✅ safety item for audio detection
      audioElementRef.current.play().catch((err) => {
        console.warn("Autoplay may be blocked by browser:", err);
      });

      dc.addEventListener("open", () => {
        logClientEvent({}, "data_channel.open");
        console.log('Data channel opened, setting session to CONNECTED');
        setSessionStatus("CONNECTED");
      });
      dc.addEventListener("close", () => {
        logClientEvent({}, "data_channel.close");
        console.log('Data channel closed, setting session to DISCONNECTED');
        setSessionStatus("DISCONNECTED");
      });
      dc.addEventListener("error", (err: any) => {
        logClientEvent({ error: err }, "data_channel.error");
        console.error('Data channel error:', err);
      });

      setDataChannel(dc);
    } catch (err) {
      console.error("Error connecting to OpenAI Live:", err);
      setSessionStatus("DISCONNECTED");
    }
  };

  // Disconnect from realtime service
  const disconnectFromRealtime = () => {
    if (pcRef.current) {
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
        }
      });

      pcRef.current.close();
      pcRef.current = null;
    }
    setDataChannel(null);
    setSessionStatus("DISCONNECTED");
    logClientEvent({}, "disconnected");
    console.log('Disconnected from OpenAI Live');
  };

  // Update connection state based on data channel
  useEffect(() => {
    if (dataChannel) {
      const updateConnectionState = () => {
        setConnectionState(dataChannel.readyState);
        console.log('Data channel state updated:', dataChannel.readyState);
      };

      dataChannel.addEventListener('open', updateConnectionState);
      dataChannel.addEventListener('close', updateConnectionState);
      dataChannel.addEventListener('error', updateConnectionState);

      setConnectionState(dataChannel.readyState);

      return () => {
        dataChannel.removeEventListener('open', updateConnectionState);
        dataChannel.removeEventListener('close', updateConnectionState);
        dataChannel.removeEventListener('error', updateConnectionState);
      };
    } else {
      setConnectionState('disconnected');
    }
  }, [dataChannel]);

  // Update connection state based on session status
  useEffect(() => {
    switch (sessionStatus) {
      case 'CONNECTING':
        setConnectionState('connecting');
        break;
      case 'DISCONNECTED':
        setConnectionState('disconnected');
        break;
    }
  }, [sessionStatus]);

  // Update audio playback
  useEffect(() => {
    if (audioElementRef.current) {
      if (isAudioPlaybackEnabled) {
        audioElementRef.current.play().catch((err) => {
          console.warn("Autoplay may be blocked by browser:", err);
        });
      } else {
        audioElementRef.current.pause();
      }
    }
  }, [isAudioPlaybackEnabled]);

  return {
    connectionState,
    dataChannel,
    dcRef,
    connectToRealtime,
    disconnectFromRealtime,
    audioElement: audioElementRef.current, // Expose the audio element
  };
}