
import React, { useRef, useState, useEffect } from 'react';
import {
  Plus,
  Mic,
  MicOff,
  ArrowUp,
  Paperclip,
  HardDrive,
  MoreHorizontal,
  Image,
  Music,
  X,
  FileText,
  Loader2,
} from 'lucide-react';

import { ModelSelector } from './ModelSelector';
import { useSpeechRecognition } from '../common/useSpeechRecognition';
import { uploadDocument } from '../services/api';

interface Props {
  onSend: (message: string, file?: File) => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  threadId: string;
  disabled?: boolean;
}

export const MessageInput: React.FC<Props> = ({
  onSend,
  selectedModel,
  onSelectModel,
  threadId,
  disabled,
}) => {
  const [input, setInput] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    isListening,
    transcript,
    error: speechError,
    isSupported,
    toggleListening,
  } = useSpeechRecognition();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // --------------------------------------------------
  // Put speech recognition result directly into input
  // --------------------------------------------------

  useEffect(() => {
    if (!isListening && !transcript) {
      return;
    }

    if (transcript) {
      setInput(transcript);

      // Keep textarea height correct
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';

          textareaRef.current.style.height = `${Math.min(
            textareaRef.current.scrollHeight,
            180
          )}px`;
        }
      });
    }
  }, [transcript, isListening]);

  // --------------------------------------------------
  // Show speech errors
  // --------------------------------------------------

  useEffect(() => {
    if (speechError) {
      console.error('Speech error:', speechError);
    }
  }, [speechError]);

  // --------------------------------------------------
  // Microphone
  // --------------------------------------------------

  const handleMicClick = () => {
    if (!isSupported) {
      alert(
        'Voice input is not supported in your current browser. Try Chrome or Edge.'
      );
      return;
    }

    toggleListening();
  };

  // --------------------------------------------------
  // Close menu when clicking outside
  // --------------------------------------------------

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // --------------------------------------------------
  // File upload
  // --------------------------------------------------

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setSelectedFile(file);
    setIsMenuOpen(false);

    try {
      setIsUploading(true);

      await uploadDocument(file, threadId);
    } catch (err) {
      console.error('File indexing failed:', err);

      alert('Failed to upload and index document.');

      setSelectedFile(null);
    } finally {
      setIsUploading(false);

      // Allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // --------------------------------------------------
  // Submit
  // --------------------------------------------------

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();

    const message = input.trim();

    if (
      (!message && !selectedFile) ||
      disabled ||
      isUploading
    ) {
      return;
    }

    // Stop microphone if still listening
    if (isListening) {
      toggleListening();
    }

    onSend(
      message,
      selectedFile || undefined
    );

    setInput('');
    setSelectedFile(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // --------------------------------------------------
  // Enter key
  // --------------------------------------------------

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      handleSubmit();
    }
  };

  // --------------------------------------------------
  // Text input
  // --------------------------------------------------

  const handleInput = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setInput(e.target.value);

    e.target.style.height = 'auto';

    e.target.style.height = `${Math.min(
      e.target.scrollHeight,
      180
    )}px`;
  };

  return (
    <div className="relative mx-auto w-full max-w-[850px] pb-6">

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.docx,.txt"
        className="hidden"
      />

      <div className="min-h-[60px] w-full rounded-[32px] bg-[#212121] flex flex-col justify-between px-3 py-2.5 gap-2 shadow-sm relative">

        {/* ------------------------------------------ */}
        {/* Selected File */}
        {/* ------------------------------------------ */}

        {selectedFile && (
          <div className="flex items-center gap-2 bg-[#2d2d2d] border border-[#3d3d3d] rounded-2xl px-3 py-1.5 w-fit ml-2 mt-1">

            <FileText
              size={18}
              className="text-[#3b5fc5]"
            />

            <div className="flex flex-col">

              <span className="text-xs text-gray-200 font-medium truncate max-w-[200px]">
                {selectedFile.name}
              </span>

              <span className="text-[10px] text-gray-400">
                {isUploading
                  ? 'Indexing for RAG...'
                  : 'Indexed & ready'}
              </span>

            </div>

            {isUploading ? (
              <Loader2
                size={14}
                className="animate-spin text-gray-400 ml-1"
              />
            ) : (
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-gray-400 hover:text-white ml-1"
              >
                <X size={14} />
              </button>
            )}

          </div>
        )}

        {/* ------------------------------------------ */}
        {/* Main Form */}
        {/* ------------------------------------------ */}

        <form
          onSubmit={handleSubmit}
          className="flex items-end w-full gap-2"
        >

          {/* ---------------------------------------- */}
          {/* Plus Menu */}
          {/* ---------------------------------------- */}

          <div
            className="relative"
            ref={menuRef}
          >

            <button
              type="button"
              disabled={disabled || isUploading}
              onClick={() =>
                setIsMenuOpen(!isMenuOpen)
              }
              className={`w-[38px] h-[38px] shrink-0 rounded-full flex items-center justify-center transition disabled:opacity-40 ${
                isMenuOpen
                  ? 'bg-[#303030] text-white rotate-45'
                  : 'text-[#b4b4b4] hover:text-white hover:bg-[#303030]'
              }`}
            >
              <Plus
                size={25}
                strokeWidth={1.8}
              />
            </button>

            {/* Dropdown */}

            {isMenuOpen && (
              <div className="absolute bottom-12 left-0 w-60 bg-[#1e1e1e] rounded-2xl shadow-2xl border border-[#2e2e2e] p-2 z-50 animate-in fade-in duration-100 text-gray-200">

                <div className="flex flex-col gap-0.5">

                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#282828] text-sm font-medium transition-colors w-full text-left"
                  >
                    <Paperclip
                      size={18}
                      className="text-gray-300"
                    />

                    <span>
                      Upload files
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left opacity-40 cursor-not-allowed"
                  >
                    <HardDrive
                      size={18}
                      className="text-gray-300"
                    />

                    <span>
                      Add from Drive
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left opacity-40 cursor-not-allowed"
                  >
                    <MoreHorizontal
                      size={18}
                      className="text-gray-300"
                    />

                    <span>
                      More uploads
                    </span>
                  </button>

                  <div className="my-1 border-t border-[#2e2e2e]" />

                  <button
                    type="button"
                    disabled
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left opacity-40 cursor-not-allowed"
                  >
                    <Image
                      size={18}
                      className="text-gray-300"
                    />

                    <span>
                      Create image
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left opacity-40 cursor-not-allowed"
                  >
                    <Music
                      size={18}
                      className="text-gray-300"
                    />

                    <span>
                      Create music
                    </span>
                  </button>

                </div>
              </div>
            )}

          </div>

          {/* ---------------------------------------- */}
          {/* Textarea */}
          {/* ---------------------------------------- */}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={1}
            placeholder={
              isListening
                ? 'Listening...'
                : 'Message NexaAI...'
            }
            className="flex-1 min-w-0 resize-none bg-transparent border-none outline-none text-[16px] leading-[24px] text-white placeholder:text-[#9b9b9b] py-[7px] max-h-[180px] overflow-y-auto"
          />

          {/* ---------------------------------------- */}
          {/* Right Controls */}
          {/* ---------------------------------------- */}

          <div className="flex items-center gap-1 shrink-0 bg-transparent">

            {/* Model */}

            <ModelSelector
              selectedModel={selectedModel}
              onSelectModel={onSelectModel}
              disabled={disabled}
            />

            {/* -------------------------------------- */}
            {/* Microphone */}
            {/* -------------------------------------- */}

            <button
              type="button"
              onClick={handleMicClick}
              disabled={disabled}
              title={
                !isSupported
                  ? 'Voice input not supported'
                  : isListening
                  ? 'Stop recording'
                  : 'Start voice input'
              }
              className={`
                w-[38px]
                h-[38px]
                rounded-full
                flex
                items-center
                justify-center
                transition-all
                cursor-pointer
                disabled:opacity-40

                ${
                  isListening
                    ? 'bg-red-600 text-white animate-pulse ring-4 ring-red-500/30'
                    : 'text-[#b4b4b4] hover:text-white hover:bg-[#303030]'
                }
              `}
            >
              {isListening ? (
                <MicOff
                  size={21}
                  strokeWidth={2}
                />
              ) : (
                <Mic
                  size={21}
                  strokeWidth={2}
                />
              )}
            </button>

            {/* -------------------------------------- */}
            {/* Send */}
            {/* -------------------------------------- */}

            <button
              type="submit"
              disabled={
                disabled ||
                (!input.trim() && !selectedFile) ||
                isUploading
              }
              className="w-[40px] h-[40px] rounded-full flex items-center justify-center bg-[#3b5fc5] hover:bg-[#4a6fd8] text-white transition disabled:bg-[#676767] disabled:text-[#b5b5b5] disabled:cursor-not-allowed"
            >
              <ArrowUp
                size={22}
                strokeWidth={2.5}
              />
            </button>

          </div>

        </form>

        {/* ------------------------------------------ */}
        {/* Speech Error */}
        {/* ------------------------------------------ */}

        {speechError && (
          <div className="px-3 pb-1 text-xs text-red-400">
            {speechError}
          </div>
        )}

      </div>
    </div>
  );
};

