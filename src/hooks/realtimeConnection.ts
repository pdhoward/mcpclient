import { RefObject } from "react";

export async function createRealtimeConnection(
  EPHEMERAL_KEY: string,
  audioElement: RefObject<HTMLAudioElement | null>
): Promise<{ pc: RTCPeerConnection; dc: RTCDataChannel }> {
  const pc = new RTCPeerConnection(); // peer connection

  // when rtc connection receives response from openai, ai voice is assigned to this audio element
  pc.ontrack = (e) => {
    if (audioElement.current) {
        audioElement.current.srcObject = e.streams[0];
    }
  };

  const ms = await navigator.mediaDevices.getUserMedia({ audio: true }); // captures live audtion stream from microphone
  pc.addTrack(ms.getTracks()[0]); // the audio stream is added to peer connection here

  const dc = pc.createDataChannel("oai-events"); // data connection for messaging

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // new model
  // gpt-4o-realtime-preview-2025-06-03

  const baseUrl = "https://api.openai.com/v1/realtime";
  const model = "gpt-4o-realtime-preview-2024-12-17";

  const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
    method: "POST",
    body: offer.sdp,
    headers: {
      Authorization: `Bearer ${EPHEMERAL_KEY}`,
      "Content-Type": "application/sdp",
    },
  });

  const answerSdp = await sdpResponse.text();
  const answer: RTCSessionDescriptionInit = {
    type: "answer",
    sdp: answerSdp,
  };

  await pc.setRemoteDescription(answer);

  return { pc, dc };
} 