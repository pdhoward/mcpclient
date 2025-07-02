'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaPhone, FaPhoneSlash, FaMicrophone, FaMicrophoneSlash, FaEye, FaUserPlus, FaFileExport, FaDownload } from 'react-icons/fa';
import clsx from 'clsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  const [logSearchQuery, setLogSearchQuery] = useState('');

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

  const filteredLogs = logs.filter((log) =>
    log.title?.toLowerCase().includes(logSearchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <motion.div
      className="relative flex items-center justify-center w-full h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="relative w-[240px] h-[480px] bg-neutral-900 rounded-[32px] border-2 border-neutral-800 shadow-xl overflow-hidden">
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-4 bg-neutral-800 rounded-b-lg z-10" />
        <div className="absolute top-6 bottom-0 left-0 right-0 flex flex-col">
          <div className="flex-1 overflow-y-auto p-3">{children}</div>
          <div className="p-3 space-y-2 border-t border-neutral-800">
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
                  <div className="flex items-center gap-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="p-1.5 rounded-full bg-neutral-600 text-white text-xs">
                          <FaUserPlus />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="bg-neutral-900 text-neutral-200 border-neutral-800">
                        <DialogHeader>
                          <DialogTitle>Select Voice</DialogTitle>
                        </DialogHeader>
                        <div className="text-sm text-neutral-400">Coming soon</div>
                      </DialogContent>
                    </Dialog>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="p-1.5 rounded-full bg-neutral-600 text-white text-xs">
                          <FaFileExport />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="bg-neutral-900 text-neutral-200 border-neutral-800 max-w-[90vw] max-h-[80vh] w-[400px] h-[400px] flex flex-col">
                        <DialogHeader>
                          <DialogTitle>System Logs</DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                          <input
                            type="text"
                            value={logSearchQuery}
                            onChange={(e) => setLogSearchQuery(e.target.value)}
                            placeholder="Search logs..."
                            className="w-full p-1.5 bg-neutral-800 text-neutral-200 text-xs rounded-lg border border-neutral-700 focus:outline-none focus:ring-1 focus:ring-gold-500"
                          />
                        </div>
                        <div className="flex-1 overflow-y-auto text-xs text-neutral-400">
                          {filteredLogs.length > 0 ? (
                            filteredLogs.map((log, index) => (
                              <p key={index} className="border-b border-neutral-700 py-1">
                                {log.data?.text ?? 'No log content'}
                              </p>
                            ))
                          ) : (
                            <p>No logs available.</p>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    <button
                      onClick={downloadTranscription}
                      className="p-1.5 rounded-full bg-neutral-600 text-white text-xs"
                      title="Download Transcription"
                    >
                      <FaDownload />
                    </button>
                  </div>
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
                    title="End Session"
                  >
                    <FaPhoneSlash className="text-white text-xs" />
                  </button>
                </>
              )}
            </div>
            <button
              onClick={onToggleTranscription}
              className="p-1.5 bg-neutral-700 rounded-lg text-neutral-200 w-full flex justify-center"
            >
              <FaEye className="text-xs" />
            </button>
          </div>
        </div>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-neutral-400 text-sm"
        >
          ×
        </button>
      </div>
    </motion.div>
  );
};

export default IPhoneModal;