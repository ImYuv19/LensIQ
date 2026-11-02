import React from 'react';
import {
  Plus,
  Files,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Sparkles,
  TableProperties,
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useDocuments } from '../../context/DocumentContext';
import { cn } from '../../lib/utils';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenDocuments: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onOpenExtraction: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  onOpenDocuments,
  onOpenHistory,
  onOpenSettings,
  onOpenExtraction,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { conversations, activeConversationId, selectConversation, createNewChat } = useChat();
  const { user } = useAuth();
  const { documents } = useDocuments();

  const readyDocsCount = documents.filter((d) => d.status === 'ready').length;

  const handleNewChat = () => {
    createNewChat();
    onCloseMobile?.();
  };

  const handleSelectChat = (id: string) => {
    selectConversation(id);
    onCloseMobile?.();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed md:static inset-y-0 left-0 z-40 flex flex-col bg-[#0E1013] border-r border-[#23272F] transition-all duration-200 ease-in-out select-none',
          isCollapsed ? 'w-16' : 'w-64',
          isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Header / Brand */}
        <div className="h-14 flex items-center justify-between px-3.5 border-b border-[#23272F]">
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-[#D71920] flex items-center justify-center font-bold text-white text-sm shadow-sm shrink-0">
                L
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
                  LensIQ
                  <span className="text-[10px] bg-[#1E2228] text-[#8E95A2] px-1.5 py-0.2 rounded font-mono">
                    v1.0
                  </span>
                </span>
                <span className="text-[10px] text-[#8E95A2] -mt-0.5 truncate" title="The Ambitious Lens Studio by uvRaj">
                  The Ambitious Lens Studio
                </span>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 mx-auto rounded-lg bg-[#D71920] flex items-center justify-center font-bold text-white text-sm">
              L
            </div>
          )}

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex items-center justify-center w-7 h-7 rounded-md text-[#8E95A2] hover:text-white hover:bg-[#181B1F] transition-colors"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Action: New Chat */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className={cn(
              'w-full flex items-center gap-2.5 rounded-lg bg-[#181B1F] border border-[#23272F] hover:border-[#D71920]/60 hover:bg-[#1E2228] text-white text-sm font-medium transition-all p-2.5 shadow-sm group',
              isCollapsed && 'justify-center p-2.5'
            )}
            title="New Conversation"
          >
            <Plus className="w-4 h-4 text-[#D71920] group-hover:scale-110 transition-transform shrink-0" />
            {!isCollapsed && <span>New Chat</span>}
          </button>
        </div>

        {/* Main Navigation Links */}
        <div className="px-3 space-y-1">
          <button
            onClick={() => {
              onOpenDocuments();
              onCloseMobile?.();
            }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#8E95A2] hover:text-white hover:bg-[#181B1F] transition-colors group',
              isCollapsed && 'justify-center px-0'
            )}
            title="Document Library"
          >
            <Files className="w-4 h-4 text-[#8E95A2] group-hover:text-white shrink-0" />
            {!isCollapsed && (
              <div className="flex-1 flex items-center justify-between">
                <span>Documents</span>
                <span className="text-[11px] bg-[#1E2228] text-[#BAC0CC] px-1.5 py-0.5 rounded-md font-mono">
                  {readyDocsCount}
                </span>
              </div>
            )}
          </button>

          <button
            onClick={() => {
              onOpenExtraction();
              onCloseMobile?.();
            }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#8E95A2] hover:text-white hover:bg-[#181B1F] transition-colors group',
              isCollapsed && 'justify-center px-0'
            )}
            title="Spreadsheet Extraction"
          >
            <TableProperties className="w-4 h-4 text-[#8E95A2] group-hover:text-[#D71920] shrink-0" />
            {!isCollapsed && (
              <div className="flex-1 flex items-center justify-between">
                <span>Extract Table</span>
                <span className="text-[10px] text-[#D71920] font-medium bg-[#D71920]/10 px-1 rounded">
                  New
                </span>
              </div>
            )}
          </button>

          <button
            onClick={() => {
              onOpenHistory();
              onCloseMobile?.();
            }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#8E95A2] hover:text-white hover:bg-[#181B1F] transition-colors group',
              isCollapsed && 'justify-center px-0'
            )}
            title="Chat History"
          >
            <History className="w-4 h-4 text-[#8E95A2] group-hover:text-white shrink-0" />
            {!isCollapsed && <span>History</span>}
          </button>

          <button
            onClick={() => {
              onOpenSettings();
              onCloseMobile?.();
            }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#8E95A2] hover:text-white hover:bg-[#181B1F] transition-colors group',
              isCollapsed && 'justify-center px-0'
            )}
            title="Settings & Usage"
          >
            <Settings className="w-4 h-4 text-[#8E95A2] group-hover:text-white shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </button>
        </div>

        {/* Recent Conversations List */}
        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto px-3 mt-4 pt-3 border-t border-[#23272F]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6270] px-2 mb-2">
              Recent Conversations
            </p>
            <div className="space-y-0.5">
              {conversations.slice(0, 8).map((conv) => {
                const isActive = conv.id === activeConversationId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectChat(conv.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left truncate group',
                      isActive
                        ? 'bg-[#181B1F] text-white font-medium border-l-2 border-[#D71920]'
                        : 'text-[#8E95A2] hover:text-[#F3F4F6] hover:bg-[#14161A]'
                    )}
                  >
                    <MessageSquare
                      className={cn(
                        'w-3.5 h-3.5 shrink-0',
                        isActive ? 'text-[#D71920]' : 'text-[#5B6270] group-hover:text-[#8E95A2]'
                      )}
                    />
                    <span className="truncate">{conv.title}</span>
                  </button>
                );
              })}
              {conversations.length === 0 && (
                <p className="text-xs text-[#5B6270] px-2 py-3">No conversations yet.</p>
              )}
            </div>
          </div>
        )}

        {isCollapsed && <div className="flex-1" />}

        {/* User Account / Footer */}
        <div className="p-3 border-t border-[#23272F] mt-auto">
          {!isCollapsed && (
            <p className="text-[10px] text-[#5B6270] mb-2 px-1 text-center font-mono truncate">
              The Ambitious Lens Studio by uvRaj
            </p>
          )}
          <div
            onClick={onOpenSettings}
            className={cn(
              'flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-[#181B1F] cursor-pointer transition-colors',
              isCollapsed && 'justify-center p-1'
            )}
          >
            <div className="w-8 h-8 rounded-full bg-[#1E2228] border border-[#23272F] flex items-center justify-center overflow-hidden shrink-0">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-white">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              )}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{user?.name || 'User'}</p>
                <div className="flex items-center gap-1 text-[10px] text-[#8E95A2]">
                  <Sparkles className="w-3 h-3 text-[#D71920]" />
                  <span>{user?.promptVersion?.toUpperCase() || 'V2'} Active</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

