import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';

interface ThinkingBlockProps {
  thinkingContent: string;
  isThinkingActive: boolean;
}

export const ThinkingBlock: React.FC<ThinkingBlockProps> = ({
  thinkingContent,
  isThinkingActive,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  // Keep block visible if there is content to show OR if it's actively thinking
  if (!thinkingContent && !isThinkingActive) return null;

  return (
    <div className="my-2.5 text-xs">
      {/* ChatGPT Style Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group inline-flex items-center gap-1.5 px-2 py-1 -ml-2 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors cursor-pointer select-none"
      >
        <Sparkles
          className={`w-3.5 h-3.5 ${
            isThinkingActive ? 'animate-pulse text-sky-400' : 'text-slate-400 group-hover:text-slate-300'
          }`}
        />
        <span className="font-medium text-[13px] tracking-tight">
          {isThinkingActive ? 'Thought for a few seconds' : 'Thought Process'}
        </span>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform" />
        )}
      </button>

      {/* ChatGPT Style Indented Left-Border Content Container */}
      {isOpen && (
        <div className="mt-1.5 pl-3.5 ml-1.5 border-l border-slate-700/60 text-slate-400 text-[12px] leading-relaxed max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          {thinkingContent ? (
            <div className="whitespace-pre-wrap font-sans text-slate-300/90">
              {thinkingContent}
            </div>
          ) : null}

          {isThinkingActive && !thinkingContent && (
            <span className="italic text-slate-500 animate-pulse">
              Analyzing query context...
            </span>
          )}
        </div>
      )}
    </div>
  );
};