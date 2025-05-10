'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import IPhoneDynamicIsland from '../IPhoneDynamicIsland';
import { FaPhone, FaPhoneSlash, FaMicrophone, FaMicrophoneSlash, FaEye } from 'react-icons/fa';

interface VoiceAgentIPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartCall: () => void;
  onEndCall: () => void;
  onMute: () => void;
  isMuted: boolean;
  isCallActive: boolean; 
  onSendText: (text: string) => void;
  onToggleTranscription: () => void;
  showTranscription: boolean;
  children: React.ReactNode;
}

const iPhoneModal: React.FC<VoiceAgentIPhoneModalProps> = ({
  isOpen,
  onClose,
  onStartCall,
  onEndCall,
  onMute,
  isMuted, 
  isCallActive, 
  onSendText,
  onToggleTranscription,
  showTranscription,
  children,
}) => {
  const [textInput, setTextInput] = useState('');

  const handleSendText = () => {
    if (textInput.trim()) {
      onSendText(textInput);
      setTextInput('');
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* iPhone Frame */}
      <div className="relative w-[300px] h-[600px] bg-neutral-900 rounded-[40px] border-4 border-neutral-800 shadow-2xl overflow-hidden">
        {/* iPhone Notch */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-6 bg-neutral-800 rounded-b-xl z-10" />

        {/* Screen Content */}
        <div className="absolute top-8 bottom-0 left-0 right-0 flex flex-col">
          {/* Render MetaAgent (or other children) inside the iPhone */}
          <div className="flex-1 overflow-y-auto p-4">{children}</div>

          {/* Bottom Controls */}
          <div className="p-4 space-y-3">
            {/* iPhone Dynamic Island */}
            <IPhoneDynamicIsland
              title="Voice Agent Controls"
              tags={['voice', 'call']}
              className="w-full"
            >
              <div className="flex items-center justify-between w-full">
                 {isCallActive ? (
                  <>
                    <button
                      onClick={onMute}
                      className={`p-2 rounded-full ${isMuted ? 'bg-yellow-500' : 'bg-neutral-600'}`}
                    >
                      {isMuted ? (
                        <FaMicrophoneSlash className="text-white" />
                      ) : (
                        <FaMicrophone className="text-white" />
                      )}
                    </button>
                    <button
                      onClick={onEndCall}
                      className="p-2 rounded-full bg-red-600"
                    >
                      <FaPhoneSlash className="text-white" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={onStartCall}
                    className="p-2 rounded-full bg-green-600"
                  >
                    <FaPhone className="text-white" />
                  </button>
                )}
              </div>
            </IPhoneDynamicIsland>

            {/* Text Input and Transcription Toggle */}
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendText()}
                placeholder="Type a message..."
                className="flex-1 p-2 bg-neutral-800 text-neutral-200 rounded-lg border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={onToggleTranscription}
                className="p-2 bg-neutral-700 rounded-lg text-neutral-200"
              >
                <FaEye />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-2xl"
      >
        ×
      </button>
    </motion.div>
  );
};

export default iPhoneModal;