

// import React, { useEffect, useRef, useState } from 'react';
// import type { HistoryMessage } from '../services/api';
// import { ThinkingBlock } from './ThinkingBlock';

// interface Props {
//   messages: HistoryMessage[];
//   isGenerating: boolean;
// }

// export const ChatWindow: React.FC<Props> = ({ messages, isGenerating }) => {
//   const bottomRef = useRef<HTMLDivElement>(null);
//   const [copiedId, setCopiedId] = useState<string | null>(null);

//   useEffect(() => {
//     bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [messages, isGenerating]);

//   const handleCopy = (id: string, text: string) => {
//     navigator.clipboard.writeText(text);
//     setCopiedId(id);
//     setTimeout(() => setCopiedId(null), 2000);
//   };

//   const formatContent = (content: unknown) => {
//     if (!content) return null;

//     const stringContent = typeof content === 'string' ? content : JSON.stringify(content);
//     const parts = stringContent.split(/(\n>.*|\n\* .*|\n\n)/g);

//     return parts.map((part, index) => {
//       if (part.startsWith('\n> ') || part.startsWith('> ')) {
//         const quoteText = part.replace(/^(\n>|> )/, '');
//         return (
//           <blockquote
//             key={index}
//             className="my-3 pl-4 border-l-2 border-slate-200 text-slate-100 font-semibold leading-relaxed"
//           >
//             {quoteText}
//           </blockquote>
//         );
//       }
//       return <span key={index}>{part}</span>;
//     });
//   };

//   return (
//     <div className="flex-1 overflow-y-auto px-4 py-6 md:px-12 lg:px-24 space-y-6 bg-[linear-gradient(135deg,#001a29_0%,#000e16_35%,#010305_65%,#001a29_100%)] text-slate-200 scrollbar-thin scrollbar-thumb-slate-800">
//       {messages.length === 0 ? (
//         <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
//           <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center text-slate-400 text-xl border border-slate-700/50">
//             ✨
//           </div>
//           <p>Start a new conversation or ask me something...</p>
//         </div>
//       ) : (
//         messages.map((msg, idx) => {
//           const isUser = msg.role === 'user';
//           const isLastMessage = idx === messages.length - 1;

//           // Thinking is active ONLY when generating and no text response tokens have arrived yet
//           const isThinkingActive = isGenerating && isLastMessage && !msg.content && msg.type !== 'image';

//           return (
//             <div
//               key={msg.id}
//               className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-2`}
//             >
//               {isUser ? (
//                 <div className="max-w-[80%] md:max-w-[70%] px-5 py-3.5 rounded-2xl bg-[#1e2530] border border-slate-700/40 text-slate-100 text-sm leading-relaxed shadow-sm">
//                   <p className="whitespace-pre-wrap">{msg.content}</p>
//                 </div>
//               ) : (
//                 <div className="w-full max-w-3xl text-sm leading-relaxed text-slate-300 pr-4 space-y-3">
//                   {/* Streaming Thinking / Reasoning Section */}
//                   {(msg.thinkingContent || isThinkingActive) && (
//                     <ThinkingBlock
//                       thinkingContent={msg.thinkingContent || ''}
//                       isThinkingActive={isThinkingActive}
//                     />
//                   )}

//                   {/* Main Assistant Content / Image Rendering */}
//                   <div className="whitespace-pre-wrap font-normal text-slate-200">
//                     {msg.type === 'image' && msg.imageUrl ? (
//                       <div className="mt-2 flex flex-col gap-3">
//                         <p className="text-sm text-slate-300">{formatContent(msg.content)}</p>
//                         <div className="relative group max-w-[512px] rounded-2xl overflow-hidden border border-slate-700/50 bg-[#0d131d] shadow-lg">
//                           <img
//                             src={msg.imageUrl}
//                             alt="Generated AI"
//                             className="w-full h-auto object-cover rounded-2xl transition-transform duration-300 hover:scale-[1.01]"
//                             loading="lazy"
//                           />
//                           <a
//                             href={msg.imageUrl}
//                             download="nexa-ai-generated.jpg"
//                             className="absolute top-3 right-3 bg-black/75 hover:bg-black text-white px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition shadow-md"
//                           >
//                             Download Image
//                           </a>
//                         </div>
//                       </div>
//                     ) : (
//                       <>
//                         {formatContent(msg.content)}
//                         {isGenerating && isLastMessage && !msg.content && !msg.thinkingContent && (
//                           <span className="inline-flex items-center gap-1 text-slate-500 animate-pulse">
//                             <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
//                             <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
//                             <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
//                           </span>
//                         )}
//                       </>
//                     )}
//                   </div>

//                   {/* Action Bar */}
//                   {msg.content && msg.type !== 'image' && (
//                     <div className="flex items-center gap-1.5 pt-1 text-slate-400">
//                       <button
//                         onClick={() => handleCopy(msg.id, msg.content)}
//                         className="p-1.5 hover:text-slate-200 hover:bg-slate-800/60 rounded-md transition cursor-pointer"
//                         title="Copy text"
//                       >
//                         {copiedId === msg.id ? (
//                           <span className="text-xs text-emerald-400">Copied!</span>
//                         ) : (
//                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path
//                               strokeLinecap="round"
//                               strokeLinejoin="round"
//                               strokeWidth="1.8"
//                               d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
//                             />
//                           </svg>
//                         )}
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>
//           );
//         })
//       )}
//       <div ref={bottomRef} />
//     </div>
//   );
// };


import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import type { HistoryMessage } from '../services/api';
import { ThinkingBlock } from './ThinkingBlock';


interface Props {
  messages: HistoryMessage[];
  isGenerating: boolean;
  onSelectPrompt?: (promptText: string) => void;
}

export const ChatWindow: React.FC<Props> = ({ messages, isGenerating, onSelectPrompt, }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-12 lg:px-24 space-y-6 bg-[linear-gradient(135deg,#001a29_0%,#000e16_35%,#010305_65%,#001a29_100%)] text-slate-200 scrollbar-thin scrollbar-thumb-slate-800">
      {messages.length === 0 ? (
    <div className="h-full flex flex-col items-center justify-center max-w-4xl mx-auto px-4 py-8 text-center space-y-8 animate-fade-in">
  {/* Hero Header */}
  <div className="flex flex-col items-center space-y-3">
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-indigo-500 p-[1px] shadow-lg shadow-cyan-500/10">
      <div className="w-full h-full bg-[#030a12] rounded-[15px] flex items-center justify-center text-2xl">
        ✨
      </div>
    </div>
    <h1 className="text-2xl md:text-3xl font-semibold text-slate-100 tracking-tight">
      Where knowledge meets creativity
    </h1>
    <p className="text-sm text-slate-400 max-w-md">
      Ask questions, summarize documents, generate images, or write code with NexaAI.
    </p>
  </div>

  {/* Interactive Suggestion Cards */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-2xl text-left">
    <button
      onClick={() => onSelectPrompt?.("How do I solve the Traveling Salesperson Problem using Dynamic Programming?")}
      className="group p-4 rounded-xl bg-slate-900/50 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700/60 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3"
    >
      <span className="text-xs font-medium text-slate-300 group-hover:text-cyan-400 transition-colors">
        💡 Algorithm & Logic
      </span>
      <p className="text-sm text-slate-400 group-hover:text-slate-200 line-clamp-2">
        Explain dynamic programming approach for the Traveling Salesperson Problem.
      </p>
    </button>

    <button
      onClick={() => onSelectPrompt?.("/image A futuristic cyberpunk city at sunset with glowing neon lights")}
      className="group p-4 rounded-xl bg-slate-900/50 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700/60 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3"
    >
      <span className="text-xs font-medium text-slate-300 group-hover:text-purple-400 transition-colors">
        🎨 Image Generation
      </span>
      <p className="text-sm text-slate-400 group-hover:text-slate-200 line-clamp-2">
        Generate a futuristic cyberpunk city skyline with glowing neon highlights.
      </p>
    </button>

    <button
      onClick={() => onSelectPrompt?.("Summarize the key takeaways and main concepts from my uploaded PDF document.")}
      className="group p-4 rounded-xl bg-slate-900/50 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700/60 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3"
    >
      <span className="text-xs font-medium text-slate-300 group-hover:text-emerald-400 transition-colors">
        📄 Document Analysis
      </span>
      <p className="text-sm text-slate-400 group-hover:text-slate-200 line-clamp-2">
        Extract key takeaways, summary points, and structural insights from uploaded files.
      </p>
    </button>

    <button
      onClick={() => onSelectPrompt?.("Write a clean React custom hook for handling real-time Web Speech API transcription.")}
      className="group p-4 rounded-xl bg-slate-900/50 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700/60 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3"
    >
      <span className="text-xs font-medium text-slate-300 group-hover:text-amber-400 transition-colors">
        ⚡ Code & Architecture
      </span>
      <p className="text-sm text-slate-400 group-hover:text-slate-200 line-clamp-2">
        Write a custom React hook for managing Web Speech API audio stream input.
      </p>
    </button>
  </div>
</div>
      ) : (
        messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isLastMessage = idx === messages.length - 1;
          const isThinkingActive = isGenerating && isLastMessage && !msg.content && msg.type !== 'image';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-2`}
            >
              {isUser ? (
                <div className="max-w-[80%] md:max-w-[70%] px-5 py-3.5 rounded-2xl bg-[#1e2530] border border-slate-700/40 text-slate-100 text-sm leading-relaxed shadow-sm">
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              ) : (
                <div className="w-full max-w-3xl text-sm leading-relaxed text-slate-300 pr-4 space-y-3">
                  {/* Thinking Section */}
                  {(msg.thinkingContent || isThinkingActive) && (
                    <ThinkingBlock
                      thinkingContent={msg.thinkingContent || ''}
                      isThinkingActive={isThinkingActive}
                    />
                  )}

                  {/* Rendered Markdown / Math / Content */}
                  <div className="prose prose-invert max-w-none text-slate-200">
                    {msg.type === 'image' && msg.imageUrl ? (
                      <div className="prose prose-invert mt-2 flex flex-col gap-3">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                        <div className="relative group max-w-[512px] rounded-2xl overflow-hidden border border-slate-700/50 bg-[#0d131d] shadow-lg">
                          <img
                            src={msg.imageUrl}
                            alt="Generated AI"
                            className="w-full h-auto object-cover rounded-2xl"
                            loading="lazy"
                          />
                          <a
                            href={msg.imageUrl}
                            download="nexa-ai-generated.jpg"
                            className="absolute top-3 right-3 bg-black/75 hover:bg-black text-white px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition shadow-md"
                          >
                            Download Image
                          </a>
                        </div>
                      </div>
                    ) : (
                      <>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {msg.content}
                        </ReactMarkdown>
                        {isGenerating && isLastMessage && !msg.content && !msg.thinkingContent && (
                          <span className="inline-flex items-center gap-1 text-slate-500 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Copy Action */}
                  {msg.content && msg.type !== 'image' && (
                    <div className="flex items-center gap-1.5 pt-1 text-slate-400">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="p-1.5 hover:text-slate-200 hover:bg-slate-800/60 rounded-md transition cursor-pointer"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? (
                          <span className="text-xs text-emerald-400">Copied!</span>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.8"
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
};