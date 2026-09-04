import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { MessageInput } from './components/MessageInput';
// import { ModelSelector } from './components/ModelSelector';
import { fetchConversations, fetchChatHistory, streamChat, uploadDocument } from './services/api';
import type{ HistoryMessage, Conversation } from './services/api';
import { generateImage } from './services/api';
// import { PanelLeft } from 'lucide-react';

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>(() => `thread-${Date.now()}`);
  const [messages, setMessages] = useState<HistoryMessage[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

 

  const loadConversations = async () => {
    try {
      const data = await fetchConversations();
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const loadHistory = async (threadId: string) => {
    try {
      const history = await fetchChatHistory(threadId);
      setMessages(
        history.map((m, idx) => ({
          id: `${threadId}-${idx}`,
          role: m.role,
          content: m.content,
        }))
      );
    } catch (err) {
      console.error('Failed to load thread history:', err);
      setMessages([]);
    }
  };

// Load threads on initial render
  useEffect(() => {
    let isMounted = true;

    const initConversations = async () => {
      try {
        await loadConversations();
      } catch (err) {
        if (isMounted) console.error(err);
      }
    };

    initConversations();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load message history when active thread changes
  useEffect(() => {
    let isMounted = true;

    if (activeThreadId) {
      const initHistory = async () => {
        try {
          await loadHistory(activeThreadId);
        } catch (err) {
          if (isMounted) console.error(err);
        }
      };

      initHistory();
    }

    return () => {
      isMounted = false;
    };
  }, [activeThreadId]);

  const handleNewChat = () => {
    const newThreadId = `thread-${Date.now()}`;
    setActiveThreadId(newThreadId);
    setMessages([]);
  };

  const handleUploadDocument = async (file: File) => {
    setIsUploading(true);
    try {
      const res = await uploadDocument(file, activeThreadId);
      alert(res.message);
      await loadConversations();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`Upload error: ${message}`);
    } finally {
      setIsUploading(false);
    }
  };

const handleSendMessage = async (userText: string, file?: File) => {
  // 1. Guard check: prevent sending empty messages if no file is present
  if (!userText.trim() && !file) return;

  const userMsgId = `user-${Date.now()}`;
  const assistantMsgId = `assistant-${Date.now()}`;

  // Check if user is requesting image generation
  const isImagePrompt =
    userText.toLowerCase().startsWith('/image') ||
    userText.toLowerCase().includes('generate image');

  // Display content for user message
  const displayContent = userText.trim() || `[Uploaded file: ${file?.name}]`;

  const userMessage: HistoryMessage = {
    id: userMsgId,
    role: 'user',
    content: displayContent,
  };

  // -------------------------------------------------------------
  // BRANCH 1: IMAGE GENERATION
  // -------------------------------------------------------------
  if (isImagePrompt) {
    const cleanPrompt = userText
      .replace(/^\/image/i, '')
      .replace(/generate image (of)?/i, '')
      .trim();

    const initialAssistantMessage: HistoryMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: `🎨 Generating image for: "${cleanPrompt}"...`,
      type: 'image',
    };

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
    setIsGenerating(true);

    try {
      const imageUrl = await generateImage(cleanPrompt || userText);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: `Here is your generated image for **${cleanPrompt || userText}**:`,
                type: 'image',
                imageUrl: imageUrl,
              }
            : msg
        )
      );
      await loadConversations();
    } catch (err: unknown) {
      console.error('Image generation error:', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: `Failed to generate image: ${err instanceof Error ? err.message : 'Unknown error'}`,
                type: 'text',
              }
            : msg
        )
      );
    } finally {
      setIsGenerating(false);
    }
    return;
  }

  // -------------------------------------------------------------
  // BRANCH 2: TEXT STREAMING / DOCUMENT CHAT
  // -------------------------------------------------------------
  const initialAssistantMessage: HistoryMessage = {
    id: assistantMsgId,
    role: 'assistant',
    content: '',
    thinkingContent: '',
    type: 'text',
  };

  setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
  setIsGenerating(true);

  try {
    // Fallback: Upload file if MessageInput hasn't uploaded it yet
    if (file) {
      try {
        await uploadDocument(file, activeThreadId);
      } catch (uploadErr) {
        console.warn('File upload fallback failed or was already indexed:', uploadErr);
      }
    }

    const payloadMessage = userText.trim() || `Analyze the uploaded document ${file?.name}`;

    for await (const token of streamChat({
      message: payloadMessage,
      thread_id: activeThreadId,
      model: selectedModel,
    })) {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== assistantMsgId) return msg;

          // Handle "thinking" status updates
          if (token.type === 'thinking') {
            return {
              ...msg,
              thinkingContent: token.text,
            };
          }

          // Append text tokens incrementally
          if (token.type === 'text') {
            return {
              ...msg,
              content: (msg.content || '') + token.text,
            };
          }

          return msg;
        })
      );
    }
    await loadConversations();
  } catch (err) {
    console.error('Stream error:', err);
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === assistantMsgId
          ? { ...msg, content: (msg.content || '') + '\n\n[Error generating response]' }
          : msg
      )
    );
  } finally {
    setIsGenerating(false);
  }
};




  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        conversations={conversations}
        activeThreadId={activeThreadId}
        onSelectThread={setActiveThreadId}
        onNewChat={handleNewChat}
        onUploadDocument={handleUploadDocument}
        isUploading={isUploading}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />


      <div className="flex-1 bg-[linear-gradient(135deg,#001a29_0%,#000e16_35%,#010305_65%,#001a29_100%)] flex flex-col h-full">
       
        <ChatWindow messages={messages} isGenerating={isGenerating} onSelectPrompt={(text) => handleSendMessage(text)} />
        <MessageInput
         onSend={handleSendMessage}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          threadId={activeThreadId}
          disabled={isGenerating}/>
          
      </div>
    </div>
  );
}