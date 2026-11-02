import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Sparkles,
  HelpCircle,
  FileSpreadsheet,
  LogOut,
  Settings,
  User,
  Check,
  Edit2,
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useDocuments } from '../../context/DocumentContext';
import { Button } from '../ui/Button';

export interface TopNavProps {
  onOpenMobileMenu: () => void;
  onOpenSettings: () => void;
  onOpenExtraction: () => void;
  onOpenOnboarding: () => void;
  onOpenLanding: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onOpenMobileMenu,
  onOpenSettings,
  onOpenExtraction,
  onOpenOnboarding,
  onOpenLanding,
}) => {
  const { activeConversation, renameConversation } = useChat();
  const { user, signOut } = useAuth();
  const { selectedDocIds, documents } = useDocuments();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeConversation) {
      setEditedTitle(activeConversation.title);
    }
  }, [activeConversation]);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveTitle = () => {
    if (activeConversation && editedTitle.trim()) {
      renameConversation(activeConversation.id, editedTitle.trim());
      setIsEditingTitle(false);
    }
  };

  const selectedDocsCount = selectedDocIds.length;

  return (
    <header className="h-14 bg-[#0E1013] border-b border-[#23272F] flex items-center justify-between px-3 md:px-5 shrink-0 z-20">
      {/* Left: Mobile Menu & Conversation Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-1.5 text-[#8E95A2] hover:text-white rounded-md hover:bg-[#181B1F] transition-colors"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Title / Editable */}
        <div className="flex items-center gap-2 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                autoFocus
                className="bg-[#181B1F] text-sm text-white px-2 py-1 rounded border border-[#D71920]/60 outline-none w-48 sm:w-64"
              />
              <button
                onClick={handleSaveTitle}
                className="p-1 text-emerald-400 hover:text-emerald-300"
                title="Save"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => {
                if (activeConversation) {
                  setEditedTitle(activeConversation.title);
                  setIsEditingTitle(true);
                }
              }}
              className="group flex items-center gap-2 cursor-pointer py-1 px-1.5 -ml-1.5 rounded-md hover:bg-[#181B1F] transition-colors min-w-0"
              title="Click to rename conversation"
            >
              <h1 className="text-sm font-semibold text-[#F3F4F6] truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                {activeConversation?.title || 'LensIQ Workspace'}
              </h1>
              <Edit2 className="w-3.5 h-3.5 text-[#5B6270] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          )}

          {/* Active docs count badge */}
          {selectedDocsCount > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-[#181B1F] text-[#8E95A2] border border-[#23272F] px-2 py-0.5 rounded-full shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {selectedDocsCount} doc{selectedDocsCount > 1 ? 's' : ''} active
            </span>
          )}

          {/* Subtle Studio Attribution in Workspace */}
          <span className="hidden lg:inline-flex text-[11px] text-[#5B6270] font-mono ml-2 border-l border-[#23272F] pl-3">
            The Ambitious Lens Studio by uvRaj
          </span>
        </div>
      </div>

      {/* Right: Actions & User Menu */}
      <div className="flex items-center gap-2">
        {/* Spreadsheet extraction quick trigger */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenExtraction}
          className="hidden sm:flex text-xs h-8 border-[#23272F] hover:border-[#D71920]/40 text-[#BAC0CC]"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-[#D71920]" />
          <span>Extract Table</span>
        </Button>

        {/* Tour / Guide button */}
        <button
          onClick={onOpenOnboarding}
          className="p-1.5 text-[#8E95A2] hover:text-white hover:bg-[#181B1F] rounded-md transition-colors"
          title="Product Tour"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Profile Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-[#181B1F] transition-colors focus-visible:outline-none"
            aria-expanded={isProfileMenuOpen}
          >
            <div className="w-7 h-7 rounded-full bg-[#1E2228] border border-[#23272F] flex items-center justify-center overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-white">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              )}
            </div>
          </button>

          {/* Dropdown Menu */}
          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#121417] border border-[#23272F] shadow-modal py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-2 border-b border-[#23272F]">
                <p className="text-xs font-semibold text-white truncate">{user?.name || 'Guest User'}</p>
                <p className="text-[11px] text-[#8E95A2] truncate">{user?.email || 'guest@lensiq.ai'}</p>
                <p className="text-[10px] text-[#5B6270] font-mono mt-1 pt-1 border-t border-[#23272F]/50">
                  The Ambitious Lens Studio by uvRaj
                </p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-[#BAC0CC] hover:text-white hover:bg-[#181B1F] transition-colors text-left"
                >
                  <User className="w-4 h-4 text-[#8E95A2]" />
                  <span>Account & Profile</span>
                </button>

                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-[#BAC0CC] hover:text-white hover:bg-[#181B1F] transition-colors text-left"
                >
                  <Settings className="w-4 h-4 text-[#8E95A2]" />
                  <span>Settings & Usage</span>
                </button>
              </div>

              <div className="border-t border-[#23272F] pt-1">
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

