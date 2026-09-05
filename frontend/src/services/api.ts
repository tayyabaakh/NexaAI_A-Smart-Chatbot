// const BASE_URL = 'http://localhost:8000';
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// --- Types & Interfaces ---

export interface Conversation {
  thread_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  imageUrl?: string;
}

export interface HistoryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinkingContent?: string;
  type?: 'text' | 'image';
  imageUrl?: string;
}

export interface StreamToken {
  type: 'thinking' | 'text';
  text: string;
}

export interface StreamChatPayload {
  message: string;
  thread_id: string;
  model: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
}

// --- API Service Methods ---

export async function generateImage(prompt: string): Promise<string> {
  const response = await fetch('http://localhost:8000/generate-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', // ✅ CORRECT
    },
    body: JSON.stringify({ prompt }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to generate image');
  }

  return data.imageUrl;
}
export async function fetchConversations(): Promise<Conversation[]> {
  const response = await fetch(`${BASE_URL}/conversations`);
  if (!response.ok) {
    throw new Error(`Failed to fetch conversations: ${response.statusText}`);
  }
  const data = await response.json();
  return data.conversations || [];
}

export async function fetchChatHistory(threadId: string): Promise<HistoryMessage[]> {
  const response = await fetch(`${BASE_URL}/history/${threadId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch history for thread ${threadId}`);
  }
  const data = await response.json();
  return data.messages || [];
}

export async function uploadDocument(file: File, threadId: string): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('thread_id', threadId);

  try {
    const response = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    let data: UploadResponse;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.ok || !data.success) {
      throw new Error(data.message || `Upload failed with status ${response.status}`);
    }

    return data;
  } catch (error: unknown) {
    console.error('API uploadDocument error:', error);
    throw error;
  }
}

/**
 * Async Generator to consume Server-Sent Events (SSE) from POST /chat/stream
 */
export async function* streamChat({
  message,
  thread_id,
  model,
}: StreamChatPayload): AsyncGenerator<StreamToken, void, unknown> {
  const response = await fetch(`${BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      thread_id,
      model,
    }),
  });

  if (!response.ok || !response.body) {
    let errorMsg = `HTTP error! Status: ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.error) errorMsg = errJson.error;
    } catch (e: unknown) {
      if (e instanceof Error) {
        errorMsg = e.message;
      }
    }
    throw new Error(errorMsg);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        buffer += decoder.decode();
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split(/\n\n|\r\n\r\n/);
      buffer = parts.pop() || '';

      for (const part of parts) {
        const lines = part.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();

          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const jsonStr = trimmed.replace(/^data:\s*/, '');

          if (jsonStr === '[DONE]') return;

          try {
            const parsed = JSON.parse(jsonStr);

            if (parsed.error) {
              throw new Error(parsed.error);
            }

            if (parsed.done) {
              return;
            }

            // Yield object directly matching StreamToken interface
          if (parsed.type === 'thinking' || parsed.type === 'text') {
  let safeText = '';

  if (typeof parsed.text === 'string') {
    safeText = parsed.text;
  } else if (typeof parsed.text === 'object' && parsed.text !== null) {
    // If backend sent an object (like tool call or search result dict)
    safeText = parsed.text.text || JSON.stringify(parsed.text);
  } else if (parsed.text !== undefined && parsed.text !== null) {
    safeText = String(parsed.text);
  }

  yield {
    type: parsed.type,
    text: safeText,
  };
}
          } catch (e: unknown) {
            if (e instanceof Error && e.message && !e.message.includes('Unexpected token')) {
              throw e;
            }
            console.warn('Failed to parse SSE payload block:', jsonStr, e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}