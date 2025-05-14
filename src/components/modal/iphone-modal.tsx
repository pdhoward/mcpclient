'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaPhone, FaPhoneSlash, FaMicrophone, FaMicrophoneSlash, FaEye, FaUserPlus, FaFileExport, FaTimes } from 'react-icons/fa';
import { HiOutlineArrowUpRight } from 'react-icons/hi2';
import clsx from 'clsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TranscriptItem } from '@/lib/types';

interface IPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartCall: () => void;
  onEndCall: () => void;
  onEndSession: () => void;  // this closed the modal
  onMute: () => void;
  isMuted: boolean;
  isCallActive: boolean;
  onSendText: (text: string) => void;
  onToggleTranscription: () => void;
  showTranscription: boolean;
  logs: TranscriptItem[];
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

  // Filter logs based on search query
  const filteredLogs = logs.filter((log) =>
    log.data?.text?.toLowerCase().includes(logSearchQuery.toLowerCase())
  );

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
          {/* Render MetaAgent's content */}
          <div className="flex-1 overflow-y-auto p-4">{children}</div>

          {/* Bottom Controls */}
          <div className="p-4 space-y-3">
            {/* Integrated Dynamic Island Section */}
            <article>
              <div
                className={clsx(
                  'my-2 flex w-full items-center justify-center rounded-full border border-neutral-800 bg-neutral-900/90 backdrop-blur-sm py-2 px-4'
                )}
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
                      <div className="flex items-center gap-x-2">
                        {/* Select Voice Button */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <button
                              className="p-2 rounded-full bg-neutral-600 text-white"
                            >
                              <FaUserPlus />
                            </button>
                          </DialogTrigger>
                          <DialogContent className="bg-neutral-900 text-neutral-200 border-neutral-800">
                            <DialogHeader>
                              <DialogTitle>Select Voice</DialogTitle>
                            </DialogHeader>
                            <div className="text-sm text-neutral-400">
                              Coming soon
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Show System Logs Button */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <button
                              className="p-2 rounded-full bg-neutral-600 text-white"
                            >
                              <FaFileExport />
                            </button>
                          </DialogTrigger>
                          <DialogContent className="bg-neutral-900 text-neutral-200 border-neutral-800 max-w-[90vw] max-h-[80vh] w-[600px] h-[500px] flex flex-col">
                            <DialogHeader>
                              <DialogTitle>System Logs</DialogTitle>
                            </DialogHeader>
                            <div className="mt-4">
                              <input
                                type="text"
                                value={logSearchQuery}
                                onChange={(e) => setLogSearchQuery(e.target.value)}
                                placeholder="Search logs..."
                                className="w-full p-2 mb-4 bg-neutral-800 text-neutral-200 rounded-lg border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div className="flex-1 overflow-y-auto text-sm text-neutral-400">
                              {filteredLogs.length > 0 ? (
                                filteredLogs.map((log, index) => (
                                  <p key={index} className="border-b border-neutral-700 py-2">
                                    {log.data?.text ?? 'No log content'}
                                  </p>
                                ))
                              ) : (
                                <p>No logs available.</p>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <button
                        onClick={onEndCall}
                        className="p-2 rounded-full bg-red-600"
                      >
                        <FaPhoneSlash className="text-white" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={onStartCall}
                        className="p-2 rounded-full bg-green-600"
                      >
                        <FaPhone className="text-white" />
                      </button>
                      <button
                          onClick={onEndSession}
                          className="p-2 rounded-full bg-gray-600"
                          title="End Session"
                        >
                          <FaTimes className="text-white" /> {/* New icon for end session */}
                      </button>
                    </>
                    
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-x-2">
                  {['Agents for Business'].map((tag, index) => (
                    <div
                      key={index}
                      className="cursor-default rounded bg-neutral-800 px-2 py-1 text-xs tracking-tight text-neutral-400"
                    >
                      {tag}
                    </div>
                  ))}
                </div>
                <a
                  className="flex items-center text-sm tracking-tight text-neutral-400"
                  href="https://www.strategicmachines.ai/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Learn More
                  <HiOutlineArrowUpRight className="ml-1 mt-[1px] text-xs text-neutral-500" />
                </a>
              </div>
            </article>

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

export default IPhoneModal;