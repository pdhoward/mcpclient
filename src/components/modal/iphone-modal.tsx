'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaPhone, FaPhoneSlash, FaMicrophone, FaMicrophoneSlash, FaEye, FaDownload } from 'react-icons/fa';
import clsx from 'clsx';
import { TranscriptItem } from '@/lib/types';

interface IPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartCall: () => void;
  onEndCall: () => void;
  onEndSession: () => void;
  onMute: () => void;
  isMuted: boolean;
  isCallActive: boolean;
  onSendText: (text: string) => void;
  onToggleTranscription: () => void;
  showTranscription: boolean;
  logs: TranscriptItem[];
  transcriptItems?: TranscriptItem[];
  children: React.ReactNode;
}

const IPhoneModal: React.FC<IPhoneModalProps> = ({
  isOpen,
  onClose,
  onStartCall,
  onEndCall,
  onEndSession,
  onMute,
  isMuted,
  isCallActive,
  onSendText,
  onToggleTranscription,
  showTranscription,
  logs,
  transcriptItems,
  children,
}) => {
  const [textInput, setTextInput] = useState('');

  const handleSendText = () => {
    if (textInput.trim()) {
      onSendText(textInput);
      setTextInput('');
    }
  };

  const downloadTranscription = () => {
    if (!transcriptItems) return;
    const transcriptText = transcriptItems
      .filter((item) => item.type === 'MESSAGE' && !item.isHidden)
      .map((item) => `${item.role === 'user' ? 'User' : 'Assistant'} (${item.timestamp}): ${item.data?.text || 'No message content'}`)
      .join('\n');
    const blob = new Blob([transcriptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="w-[240px] h-[480px] bg-neutral-900 rounded-[32px] border-2 border-neutral-800 shadow-xl overflow-hidden"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      {/* iPhone Notch */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-4 bg-neutral-800 rounded-b-lg" />

      {/* Content */}
      <div className="absolute top-6 bottom-0 left-0 right-0 flex flex-col">
        <div className="flex-1 overflow-y-auto p-3">{children}</div>

        {/* Controls */}
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            {isCallActive ? (
              <>
                <button
                  onClick={onMute}
                  className={`p-1.5 rounded-full ${isMuted ? 'bg-yellow-500' : 'bg-neutral-600'}`}
                >
                  {isMuted ? (
                    <FaMicrophoneSlash className="text-white text-xs" />
                  ) : (
                    <FaMicrophone className="text-white text-xs" />
                  )}
                </button>
                <button
                  onClick={downloadTranscription}
                  className="p-1.5 rounded-full bg-neutral-600 text-white text-xs"
                >
                  <FaDownload />
                </button>
                <button
                  onClick={onEndCall}
                  className="p-1.5 rounded-full bg-red-600"
                >
                  <FaPhoneSlash className="text-white text-xs" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onStartCall}
                  className="p-1.5 rounded-full bg-green-600"
                >
                  <FaPhone className="text-white text-xs" />
                </button>
                <button
                  onClick={onEndSession}
                  className="p-1.5 rounded-full bg-neutral-600"
                >
                  <FaPhoneSlash className="text-white text-xs" />
                </button>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendText()}
              placeholder="Type a message..."
              className="flex-1 p-1.5 bg-neutral-800 text-neutral-200 text-xs rounded-lg border border-neutral-700 focus:outline-none focus:ring-1 focus:ring-gold-500"
            />
            <button
              onClick={onToggleTranscription}
              className="p-1.5 bg-neutral-700 rounded-lg text-neutral-200"
            >
              <FaEye className="text-xs" />
            </button>
          </div>
        </div>
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-neutral-400 text-sm"
      >
        ×
      </button>
    </motion.div>
  );
};

export default IPhoneModal;