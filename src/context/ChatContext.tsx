import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage, Citation, Conversation, ResponsePreference } from '../types/chat';
import { chatService } from '../services/chatService';
import { authService } from '../services/authService';
import { useDocuments } from './DocumentContext';
import { useToast } from './ToastContext';

interface ChatContextValue {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  messages: ChatMessage[];
  preference: ResponsePreference;
  isGenerating: boolean;
  streamingMessageText: string;
  streamingCitations: Citation[];
  setPreference: (pref: ResponsePreference) => void;
  selectConversation: (id: string) => void;
  createNewChat: (docIds?: string[]) => string;
  sendMessage: (text: string) => Promise<void>;
  regenerateLastResponse: () => Promise<void>;
  stopGeneration: () => void;
  setFeedback: (messageId: string, feedback: 'like' | 'dislike' | null) => void;
  renameConversation: (id: string, newTitle: string) => void;
  deleteConversation: (id: string) => void;
  refreshConversations: () => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

function generateTitleFromPrompt(prompt: string): string {
  const clean = prompt.trim().replace(/[?!.]+$/, '');
  const words = clean.split(/\s+/);
  if (words.length <= 6) {
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return words.slice(0, 6).join(' ') + '...';
}

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [preference, setPreference] = useState<ResponsePreference>('balanced');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [streamingMessageText, setStreamingMessageText] = useState<string>('');
  const [streamingCitations, setStreamingCitations] = useState<Citation[]>([]);

  const isInitializedRef = useRef(false);

  const { selectedDocIds, documents, selectAllDocs } = useDocuments();
  const { showToast } = useToast();

  const refreshConversations = useCallback(() => {
    const list = chatService.getConversations();
    setConversations(list);
    return list;
  }, []);

  // Initialize once on mount
  useEffect(() => {
    const list = refreshConversations();
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      if (list.length > 0) {
        setActiveConversationId(list[0].id);
        setMessages(chatService.getMessages(list[0].id));
      } else {
        setActiveConversationId('draft');
        setMessages([]);
      }
    }
  }, [refreshConversations]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversationId && activeConversationId !== 'draft') {
      setMessages(chatService.getMessages(activeConversationId));
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  const selectConversation = (id: string) => {
    if (isGenerating) {
      stopGeneration();
    }
    setActiveConversationId(id);
    setStreamingMessageText('');
    setStreamingCitations([]);

    const conv = chatService.getConversation(id);
    if (conv && conv.selectedDocIds && conv.selectedDocIds.length > 0) {
      const readyDocIds = conv.selectedDocIds.filter((docId) => {
        const d = documents.find((item) => item.id === docId);
        return d ? d.status === 'ready' : true;
      });
      if (readyDocIds.length > 0) {
        selectAllDocs(readyDocIds);
      }
    }
  };

  // Opens a fresh empty conversation draft without persisting to history
  const createNewChat = (_docIds?: string[]): string => {
    if (isGenerating) {
      stopGeneration();
    }
    setActiveConversationId('draft');
    setMessages([]);
    setStreamingMessageText('');
    setStreamingCitations([]);
    return 'draft';
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isGenerating) return;

    let convId = activeConversationId;
    // Persist conversation only after first message is submitted
    if (!convId || convId === 'draft') {
      const generatedTitle = generateTitleFromPrompt(text);
      const newConv = chatService.createConversation(selectedDocIds, generatedTitle);
      convId = newConv.id;
      setActiveConversationId(newConv.id);
      refreshConversations();
    }

    setIsGenerating(true);
    setStreamingMessageText('');
    setStreamingCitations([]);

    try {
      await chatService.sendMessage({
        conversationId: convId,
        content: text,
        preference,
        promptVersion: authService.getCurrentUser()?.promptVersion || 'v2',
        selectedDocIds,
        onChunk: (accumulated, citations) => {
          setStreamingMessageText(accumulated);
          if (citations) setStreamingCitations(citations);
        },
        onComplete: (_msg) => {
          setIsGenerating(false);
          setStreamingMessageText('');
          setStreamingCitations([]);
          refreshConversations();
          setMessages(chatService.getMessages(convId!));
        },
        onError: (err) => {
          setIsGenerating(false);
          setStreamingMessageText('');
          setStreamingCitations([]);
          showToast('Question Failed', err.message, 'error');
        },
      });
    } catch {
      setIsGenerating(false);
      showToast('Error', 'Unable to generate response.', 'error');
    }
  };

  const regenerateLastResponse = async () => {
    if (!activeConversationId || isGenerating) return;
    const currentMsgs = chatService.getMessages(activeConversationId);
    // Find last user message
    const lastUserMsg = [...currentMsgs].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    // Send it again
    await sendMessage(lastUserMsg.content);
  };

  const stopGeneration = () => {
    chatService.stopGeneration();
    setIsGenerating(false);
    setStreamingMessageText('');
    setStreamingCitations([]);
    showToast('Generation Stopped', 'AI response stream halted.', 'info');
  };

  const setFeedback = (messageId: string, feedback: 'like' | 'dislike' | null) => {
    if (!activeConversationId) return;
    chatService.setFeedback(activeConversationId, messageId, feedback);
    setMessages(chatService.getMessages(activeConversationId));
    showToast('Feedback Received', feedback ? `Marked as ${feedback}d.` : 'Feedback cleared.', 'info');
  };

  const renameConversation = (id: string, newTitle: string) => {
    const success = chatService.renameConversation(id, newTitle);
    if (success) {
      refreshConversations();
      showToast('Chat Renamed', `Updated to "${newTitle}"`, 'success');
    }
  };

  const deleteConversation = (id: string) => {
    const success = chatService.deleteConversation(id);
    if (success) {
      const remaining = refreshConversations();
      if (activeConversationId === id) {
        if (remaining.length > 0) {
          setActiveConversationId(remaining[0].id);
        } else {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
      showToast('Chat Deleted', 'Conversation removed.', 'info');
    }
  };

  // Active conversation is either a saved conversation or an unsaved temporary draft
  const activeConversation: Conversation | null =
    (activeConversationId ? conversations.find((c) => c.id === activeConversationId) : null) || {
      id: 'draft',
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      selectedDocIds,
      messageCount: 0,
    };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversationId,
        activeConversation,
        messages,
        preference,
        isGenerating,
        streamingMessageText,
        streamingCitations,
        setPreference,
        selectConversation,
        createNewChat,
        sendMessage,
        regenerateLastResponse,
        stopGeneration,
        setFeedback,
        renameConversation,
        deleteConversation,
        refreshConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};

