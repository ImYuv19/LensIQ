import React, { useState } from 'react';
import {
  Search,
  MessageSquare,
  Trash2,
  Edit2,
  Calendar,
  Check,
  X,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { Conversation, ConversationGroup } from '../../types/chat';
import { chatService } from '../../services/chatService';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { formatRelativeTime } from '../../lib/utils';

export interface ChatHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatHistoryModal: React.FC<ChatHistoryModalProps> = ({ isOpen, onClose }) => {
  const {
    conversations,
    activeConversationId,
    selectConversation,
    renameConversation,
    deleteConversation,
  } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newTitleInput, setNewTitleInput] = useState('');
  const [deleteConfirmConv, setDeleteConfirmConv] = useState<Conversation | null>(null);

  const grouped = chatService.getGroupedConversations(searchQuery);
  const groupKeys: ConversationGroup[] = ['Today', 'Yesterday', 'Previous 7 Days', 'Older'];

  const handleSelect = (id: string) => {
    selectConversation(id);
    onClose();
  };

  const handleStartRename = (conv: Conversation) => {
    setRenamingId(conv.id);
    setNewTitleInput(conv.title);
  };

  const handleSaveRename = (id: string) => {
    if (newTitleInput.trim()) {
      renameConversation(id, newTitleInput.trim());
      setRenamingId(null);
    }
  };

  const totalResults = Object.values(grouped).reduce((sum, list) => sum + list.length, 0);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="2xl"
        title={
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white">Chat History</h3>
            <span className="text-xs bg-[#1E2228] text-[#8E95A2] px-2 py-0.5 rounded-full font-mono">
              {conversations.length} sessions
            </span>
          </div>
        }
        description="Search past question-and-answer sessions and continue from where you left off."
      >
        <div className="space-y-5">
          {/* Search bar */}
          <div className="relative">
            <Input
              placeholder="Search conversation topics or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>

          {/* Grouped conversations */}
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
            {groupKeys.map((group) => {
              const list = grouped[group];
              if (list.length === 0) return null;

              return (
                <div key={group} className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5B6270] px-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{group}</span>
                    <span className="text-[10px] text-[#8E95A2] font-mono">({list.length})</span>
                  </div>

                  <div className="space-y-1.5">
                    {list.map((conv) => {
                      const isActive = conv.id === activeConversationId;
                      const isRenaming = renamingId === conv.id;

                      return (
                        <div
                          key={conv.id}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            isActive
                              ? 'bg-[#181B1F] border-[#D71920]/40 shadow-sm'
                              : 'bg-[#121417] border-[#23272F] hover:bg-[#181B1F]/60 hover:border-[#353B47]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                            <div
                              className={`p-2 rounded-lg shrink-0 ${
                                isActive ? 'bg-[#D71920]/15 text-[#D71920]' : 'bg-[#181B1F] text-[#8E95A2]'
                              }`}
                            >
                              <MessageSquare className="w-4 h-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              {isRenaming ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={newTitleInput}
                                    onChange={(e) => setNewTitleInput(e.target.value)}
                                    autoFocus
                                    className="bg-[#121417] border border-[#D71920] px-2 py-0.5 rounded text-xs text-white outline-none w-full"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveRename(conv.id);
                                      if (e.key === 'Escape') setRenamingId(null);
                                    }}
                                  />
                                  <button
                                    onClick={() => handleSaveRename(conv.id)}
                                    className="text-emerald-400 p-1"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setRenamingId(null)}
                                    className="text-[#8E95A2] p-1"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <p
                                    onClick={() => handleSelect(conv.id)}
                                    className="text-sm font-medium text-white truncate cursor-pointer hover:underline"
                                  >
                                    {conv.title}
                                  </p>
                                  {conv.lastMessageSnippet && (
                                    <p className="text-xs text-[#8E95A2] truncate mt-0.5">
                                      {conv.lastMessageSnippet}
                                    </p>
                                  )}
                                  <span className="text-[10px] text-[#5B6270] mt-1 inline-block">
                                    {formatRelativeTime(conv.updatedAt)} • {conv.messageCount} messages
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Action controls */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleStartRename(conv)}
                              className="p-1.5 text-[#8E95A2] hover:text-white rounded hover:bg-[#1E2228] transition-colors"
                              title="Rename chat"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setDeleteConfirmConv(conv)}
                              className="p-1.5 text-[#8E95A2] hover:text-red-400 rounded hover:bg-red-500/10 transition-colors"
                              title="Delete chat"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleSelect(conv.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#181B1F] hover:bg-[#D71920] hover:text-white text-xs font-medium text-[#BAC0CC] transition-all ml-1"
                            >
                              <span>Open</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {totalResults === 0 && (
              <div className="py-12 text-center text-[#5B6270]">
                <p className="text-sm">No chat sessions match your search.</p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmConv !== null}
        onClose={() => setDeleteConfirmConv(null)}
        title="Delete Conversation"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                Delete "{deleteConfirmConv?.title}"?
              </p>
              <p className="text-xs text-[#8E95A2] mt-1 leading-relaxed">
                This will delete the conversation history and cited query logs permanently.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#23272F]">
            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmConv(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (deleteConfirmConv) {
                  deleteConversation(deleteConfirmConv.id);
                  setDeleteConfirmConv(null);
                }
              }}
            >
              Delete Conversation
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

