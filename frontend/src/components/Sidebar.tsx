import React, { useRef } from 'react';
import type { Conversation } from '../services/api';

import {
  Search,
  PanelLeft,
  SquarePen,
  Images,
  Library,
  Clock3,
  CircleHelp,
  Folder,
  Code2,
  MoreHorizontal,
  MessageCircle,
  Settings,
} from 'lucide-react';

interface Props {
  conversations: Conversation[];
  activeThreadId: string;
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
  onUploadDocument: (file: File) => void;
  isUploading: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<Props> = ({
  conversations,
  activeThreadId,
  onSelectThread,
  onNewChat,
  onUploadDocument,
  isOpen,
  onToggle,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadDocument(file);
      e.target.value = '';
    }
  };

  return (
    <aside
      className={`
        h-screen bg-black text-white flex flex-col select-none
        transition-all duration-300 ease-in-out shrink-0
        ${isOpen ? 'w-[330px] min-w-[330px]' : 'w-[68px] min-w-[68px]'}
      `}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        accept=".pdf,.docx,.txt,.md,.py,.csv"
        className="hidden"
      />

      {isOpen ? (
        /* ================= EXPANDED SIDEBAR VIEW ================= */
        <div className="w-[330px] flex flex-col h-full">
          <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-[#3a3a3a] scrollbar-track-transparent flex-1">
            <div className="px-4 pt-4">
              <div className="flex items-center justify-between px-1 mb-6">
                <div className="text-[23px] font-semibold tracking-[-0.5px]">
                  NexaAI
                </div>

                <div className="flex items-center gap-5 text-[#b4b4b4]">
                  <button
                    type="button"
                    aria-label="Search"
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    <Search size={22} strokeWidth={1.8} />
                  </button>

                  <button
                    type="button"
                    onClick={onToggle}
                    aria-label="Toggle sidebar"
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    <PanelLeft size={21} strokeWidth={1.8} />
                  </button>
                </div>
              </div>

              {/* New Chat */}
              <button
                onClick={onNewChat}
                className="w-full h-[44px] px-4 rounded-[13px] bg-[#1f1f1f] hover:bg-[#292929] flex items-center gap-3 text-[16px] font-normal transition-colors cursor-pointer"
              >
                <SquarePen size={21} strokeWidth={1.8} />
                <span>New chat</span>
              </button>
            </div>

            {/* Navigation */}
            <div className="px-3 mt-2">
              <SidebarItem icon={<Images size={21} strokeWidth={1.8} />} label="Images" />
              <SidebarItem icon={<Library size={21} strokeWidth={1.8} />} label="Library" />
              <SidebarItem icon={<Clock3 size={21} strokeWidth={1.8} />} label="Scheduled" />
              <SidebarItem icon={<CircleHelp size={21} strokeWidth={1.8} />} label="Plugins" />
              <SidebarItem icon={<Folder size={21} strokeWidth={1.8} />} label="Projects" />
              <SidebarItem icon={<Code2 size={21} strokeWidth={1.8} />} label="Codex" />
            </div>

            <div className="px-3 mt-1">
              <button
                type="button"
                className="w-full h-[44px] px-3 rounded-[13px] flex items-center gap-3 text-[16px] text-white hover:bg-[#1f1f1f] transition-colors cursor-pointer"
              >
                <MoreHorizontal size={21} strokeWidth={2} />
                <span>More</span>
              </button>
            </div>

            {/* Conversations */}
            <div className="px-3 mt-4">
              <div className="px-2 mb-2 text-[16px] text-[#b4b4b4]">Recent</div>
              <div className="space-y-0.5">
                {conversations.slice(0, 3).map((conversation) => (
                  <ConversationItem
                    key={`pinned-${conversation.thread_id}`}
                    conversation={conversation}
                    isActive={activeThreadId === conversation.thread_id}
                    onClick={() => onSelectThread(conversation.thread_id)}
                  />
                ))}
              </div>
              <div className="space-y-0.5">
                {conversations.slice(3).map((conversation) => (
                  <ConversationItem
                    key={`recent-${conversation.thread_id}`}
                    conversation={conversation}
                    isActive={activeThreadId === conversation.thread_id}
                    onClick={() => onSelectThread(conversation.thread_id)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Bottom User Area */}
          <div className="px-3 pb-4 pt-2">
            <button
              type="button"
              className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#1f1f1f] transition-colors text-left cursor-pointer"
            >
              <div className="w-[31px] h-[31px] rounded-full bg-[#e88bc0] flex items-center justify-center text-white text-[12px] font-medium shrink-0">
                TA
              </div>
              <div className="min-w-0">
                <div className="text-[16px] leading-[18px] text-white truncate">
                  Tayyaba Akhter
                </div>
                <div className="text-[13px] text-[#a0a0a0] mt-0.5">Free</div>
              </div>
            </button>
          </div>
        </div>
      ) : (
        /* ================= COLLAPSED ICON RAIL VIEW ================= */
        <div className="w-[68px] flex flex-col items-center justify-between h-full py-4">
          <div className="flex flex-col items-center gap-5 w-full">
            {/* Sidebar Toggle Icon */}
            <button
              type="button"
              onClick={onToggle}
              title="Expand sidebar"
              className="p-2 rounded-lg text-[#b4b4b4] hover:text-white hover:bg-[#1f1f1f] transition cursor-pointer"
            >
              <PanelLeft size={22} strokeWidth={1.8} />
            </button>

            {/* New Chat Icon */}
            <button
              type="button"
              onClick={onNewChat}
              title="New chat"
              className="p-2.5 rounded-xl bg-[#1f1f1f] text-white hover:bg-[#292929] transition cursor-pointer"
            >
              <SquarePen size={20} strokeWidth={1.8} />
            </button>

            {/* Quick Rail Navigation Icons */}
            <button
              type="button"
              title="Search"
              className="p-2 rounded-lg text-[#b4b4b4] hover:text-white hover:bg-[#1f1f1f] transition cursor-pointer"
            >
              <Search size={20} strokeWidth={1.8} />
            </button>

            <button
              type="button"
              title="Library"
              className="p-2 rounded-lg text-[#b4b4b4] hover:text-white hover:bg-[#1f1f1f] transition cursor-pointer"
            >
              <Library size={20} strokeWidth={1.8} />
            </button>

            <button
              type="button"
              title="Projects"
              className="p-2 rounded-lg text-[#b4b4b4] hover:text-white hover:bg-[#1f1f1f] transition cursor-pointer"
            >
              <Folder size={20} strokeWidth={1.8} />
            </button>

            <button
              type="button"
              title="More"
              className="p-2 rounded-lg text-[#b4b4b4] hover:text-white hover:bg-[#1f1f1f] transition cursor-pointer"
            >
              <MoreHorizontal size={20} strokeWidth={2} />
            </button>
          </div>

          {/* Bottom Settings & User Profile Avatar */}
          <div className="flex flex-col items-center gap-4 w-full">
            <button
              type="button"
              title="Settings"
              className="p-2 rounded-lg text-[#b4b4b4] hover:text-white hover:bg-[#1f1f1f] transition cursor-pointer"
            >
              <Settings size={20} strokeWidth={1.8} />
            </button>

            <button
              type="button"
              title="Tayyaba Akhter"
              className="w-[32px] h-[32px] rounded-full bg-[#e88bc0] flex items-center justify-center text-white text-[12px] font-medium shrink-0 hover:opacity-90 transition cursor-pointer"
            >
              TA
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

/* Helper Components */

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label }) => {
  return (
    <button
      type="button"
      className="w-full h-[44px] px-3 rounded-[11px] flex items-center gap-3 text-[16px] text-white hover:bg-[#1f1f1f] transition-colors cursor-pointer"
    >
      <span className="flex items-center justify-center w-[21px]">{icon}</span>
      <span>{label}</span>
    </button>
  );
};

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full h-[44px] px-2 rounded-[10px] flex items-center gap-3 text-left transition-colors cursor-pointer ${
        isActive ? 'bg-[#2a2a2a]' : 'hover:bg-[#1f1f1f]'
      }`}
    >
      <MessageCircle size={20} strokeWidth={1.8} className="shrink-0 text-white" />
      <span className="truncate text-[16px] text-white">
        {conversation.title || conversation.thread_id}
      </span>
    </button>
  );
};