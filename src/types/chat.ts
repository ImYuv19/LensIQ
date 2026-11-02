export type Role = 'user' | 'assistant' | 'system';

export type ResponsePreference = 'concise' | 'balanced' | 'detailed';

export interface Citation {
  id: string;
  docId: string;
  docName: string;
  pageNumber: number;
  highlightText: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: Role;
  content: string;
  createdAt: number;
  preference?: ResponsePreference;
  promptVersion?: 'v1' | 'v2' | 'v3';
  prompt_version?: 'v1' | 'v2' | 'v3';
  citations?: Citation[];
  attachedDocIds?: string[];
  feedback?: 'like' | 'dislike' | null;
  isStreaming?: boolean;
  followUps?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  selectedDocIds: string[];
  lastMessageSnippet?: string;
  messageCount: number;
}

export type ConversationGroup = 'Today' | 'Yesterday' | 'Previous 7 Days' | 'Older';
