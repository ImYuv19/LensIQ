import React, { useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { useDocuments } from '../../context/DocumentContext';
import { WelcomeState } from './WelcomeState';
import { MessageItem } from './MessageItem';
import { ChatInput } from './ChatInput';
import { ChatMessage } from '../../types/chat';

export interface ChatWorkspaceProps {
  onOpenDocumentLibrary: () => void;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({ onOpenDocumentLibrary }) => {
  const {
    messages,
    isGenerating,
    streamingMessageText,
    streamingCitations,
    preference,
    sendMessage,
    regenerateLastResponse,
    setFeedback,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when messages update or streaming text arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessageText]);

  const hasMessages = messages.length > 0;

  // Active streaming message object representation
  const activeStreamingMessage: ChatMessage | null = isGenerating
    ? {
        id: 'streaming_in_progress',
        conversationId: 'active',
        role: 'assistant',
        content: streamingMessageText || 'Retrieving document chunks and synthesizing response...',
        createdAt: Date.now(),
        preference,
        citations: streamingCitations,
        isStreaming: true,
      }
    : null;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0B0C0E] relative">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {!hasMessages && !isGenerating ? (
          <div className="min-h-full flex items-center justify-center">
            <WelcomeState
              onSelectPrompt={(query) => sendMessage(query)}
              onOpenDocuments={onOpenDocumentLibrary}
            />
          </div>
        ) : (
          <div className="py-4 space-y-1">
            {messages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                onRegenerate={regenerateLastResponse}
                onSelectFollowUp={(q) => sendMessage(q)}
                onSetFeedback={setFeedback}
              />
            ))}

            {/* Currently streaming response */}
            {activeStreamingMessage && (
              <MessageItem message={activeStreamingMessage} />
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}
      </div>

      {/* Chat Input Floating / Anchored at Bottom */}
      <div className="shrink-0 bg-gradient-to-t from-[#0B0C0E] via-[#0B0C0E]/95 to-transparent pt-3 z-10">
        <ChatInput onOpenDocumentLibrary={onOpenDocumentLibrary} />
      </div>
    </div>
  );
};

