import React, { useState, useRef, useEffect } from 'react';

const MODELS = [
  'mixtral-8x7b-32768',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.6-27b',
  'qwen/qwen3.8-27b',
];

interface ModelMeta {
  shortName: string;
  title: string;
  desc: string;
  badge?: string;
  isExtended?: boolean; // Separates extended thinking models with a divider
}

const getModelDetails = (modelId: string): ModelMeta => {
  switch (modelId) {
    case 'mixtral-8x7b-32768':
      return {
        shortName: 'Mixtral 8x7B',
        title: 'Mixtral 8x7B',
        desc: 'Fastest answers',
      };
    case 'qwen/qwen3.6-27b':
      return {
        shortName: 'Qwen 3.6',
        title: 'Qwen 3.6 27B',
        desc: 'All-around help',
        badge: 'New',
      };
    case 'openai/gpt-oss-20b':
      return {
        shortName: 'GPT-OSS 20B',
        title: 'GPT-OSS 20B',
        desc: 'Fast reasoning',
      };
    case 'openai/gpt-oss-120b':
      return {
        shortName: 'GPT-OSS 120B',
        title: 'GPT-OSS 120B',
        desc: 'Advanced reasoning',
      };
    case 'qwen/qwen3.8-27b':
      return {
        shortName: 'Qwen 3.8 Thinker',
        title: 'Extended thinking',
        desc: 'Complex problem solving',
        isExtended: true,
      };
    default:
      return {
        shortName: modelId,
        title: modelId,
        desc: 'General AI model',
      };
  }
};

interface Props {
  selectedModel: string;
  onSelectModel: (model: string) => void;
  disabled?: boolean;
}

export const ModelSelector: React.FC<Props> = ({ selectedModel, onSelectModel, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeModelMeta = getModelDetails(selectedModel);

  // Group models into main models and extended models
  const mainModels = MODELS.filter((m) => !getModelDetails(m).isExtended);
  const extendedModels = MODELS.filter((m) => getModelDetails(m).isExtended);

  const renderModelItem = (modelId: string) => {
    const meta = getModelDetails(modelId);
    const isSelected = selectedModel === modelId;

    return (
      <button
        key={modelId}
        type="button"
        onClick={() => {
          onSelectModel(modelId);
          setIsOpen(false);
        }}
        className={`w-full text-left px-4 py-2.5 rounded-xl transition-colors flex items-center justify-between gap-3 group ${
          isSelected ? 'bg-[#2d2d2d]' : 'hover:bg-[#282828]'
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Checkmark Slot */}
          <div className="w-4 flex items-center justify-center">
            {isSelected && (
              <svg
                className="w-4 h-4 text-gray-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>

          {/* Model Title and Description */}
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-100 group-hover:text-white">
              {meta.title}
            </span>
            <span className="text-xs text-gray-400 group-hover:text-gray-300">
              {meta.desc}
            </span>
          </div>
        </div>

        {/* Optional Tag Badge (e.g., 'New') */}
        {meta.badge && (
          <span className="text-xs text-gray-200 bg-[#383838] px-2.5 py-1 rounded-full font-medium">
            {meta.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 w-72 bg-[#1e1e1e] rounded-2xl shadow-2xl border border-[#2e2e2e] p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* Standard Models */}
          <div className="flex flex-col gap-0.5">{mainModels.map(renderModelItem)}</div>

          {/* Divider */}
          {extendedModels.length > 0 && (
            <div className="my-2 border-t border-[#2e2e2e] mx-2" />
          )}

          {/* Extended / Thinking Models */}
          <div className="flex flex-col gap-0.5">{extendedModels.map(renderModelItem)}</div>
        </div>
      )}

      {/* Gemini Pill Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 bg-[#282a2c] hover:bg-[#333538] text-gray-100 text-sm font-medium px-4 py-2 rounded-full border border-transparent transition-all focus:outline-none disabled:opacity-50 shadow-sm active:scale-95"
      >
        <span>{activeModelMeta.shortName}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
    </div>
  );
};