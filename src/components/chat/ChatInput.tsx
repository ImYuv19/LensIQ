import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Square as SquareIcon,
  Paperclip,
  X,
  FileText,
  AlertCircle,
  Loader2,
  Check,
  ChevronDown,
  Search,
  CheckSquare,
  Square,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { useDocuments } from '../../context/DocumentContext';
import { useChat } from '../../context/ChatContext';
import { ResponsePreference } from '../../types/chat';
import { cn, formatBytes } from '../../lib/utils';
import { FileType } from '../../types/document';

export interface ChatInputProps {
  onOpenDocumentLibrary: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onOpenDocumentLibrary }) => {
  const [text, setText] = useState('');
  const [isDocSelectorOpen, setIsDocSelectorOpen] = useState(false);
  const [docFilterQuery, setDocFilterQuery] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);

  const {
    selectedDocIds,
    documents,
    toggleDocSelection,
    selectAllDocs,
    clearDocSelection,
    uploadFiles,
  } = useDocuments();

  const {
    sendMessage,
    isGenerating,
    stopGeneration,
    preference,
    setPreference,
  } = useChat();

  const selectedDocs = documents.filter((d) => selectedDocIds.includes(d.id));
  const readyDocs = selectedDocs.filter((d) => d.status === 'ready');
  const hasReadyDoc = readyDocs.length > 0;

  // Filtered documents for the selection popover
  const filteredAvailableDocs = documents.filter((d) =>
    d.name.toLowerCase().includes(docFilterQuery.toLowerCase().trim())
  );
  const allReadyDocs = documents.filter((d) => d.status === 'ready');

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  // Click outside to close selector popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerButtonRef.current &&
        !triggerButtonRef.current.contains(e.target as Node)
      ) {
        setIsDocSelectorOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDocSelectorOpen) {
        setIsDocSelectorOpen(false);
      }
    };

    if (isDocSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDocSelectorOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!text.trim() || isGenerating) return;
    if (!hasReadyDoc) return;

    sendMessage(text);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const preferences: { key: ResponsePreference; label: string; tooltip: string }[] = [
    { key: 'concise', label: 'Concise', tooltip: 'Direct bullet-point summary' },
    { key: 'balanced', label: 'Balanced', tooltip: 'Standard synthesis with citations' },
    { key: 'detailed', label: 'Detailed', tooltip: 'Exhaustive cross-referencing & code/table breakdowns' },
  ];

  const getDocTypeBadge = (type: FileType) => {
    switch (type) {
      case 'pdf':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'docx':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'pptx':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 pb-4 pt-2 relative">
      {/* Attached Documents Bar */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2 px-1 relative">
        {selectedDocs.map((doc) => {
          const isReady = doc.status === 'ready';
          const isProcessing = doc.status === 'processing';
          const isFailed = doc.status === 'failed';

          return (
            <div
              key={doc.id}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-all animate-in fade-in zoom-in-95 duration-150',
                isReady
                  ? 'bg-[#181B1F] border-[#23272F] text-[#F3F4F6] shadow-sm'
                  : isProcessing
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : isFailed
                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                  : 'bg-[#181B1F] border-[#23272F] text-[#8E95A2]'
              )}
            >
              {isReady && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
              {isProcessing && <Loader2 className="w-3 h-3 text-amber-400 animate-spin shrink-0" />}
              {isFailed && <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />}

              <span className="truncate max-w-[130px] sm:max-w-[200px] font-medium">{doc.name}</span>

              {isProcessing && <span className="text-[10px] opacity-75">({doc.progress || 0}%)</span>}

              <button
                type="button"
                onClick={() => toggleDocSelection(doc.id)}
                className="text-[#8E95A2] hover:text-white ml-0.5 p-0.5 rounded hover:bg-[#23272F] transition-colors cursor-pointer"
                title="Remove attachment"
                aria-label={`Remove ${doc.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {/* Add more documents button / trigger */}
        <div className="relative inline-block">
          <button
            ref={triggerButtonRef}
            type="button"
            onClick={() => setIsDocSelectorOpen((prev) => !prev)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-colors cursor-pointer',
              isDocSelectorOpen
                ? 'bg-[#1E2228] border-[#D71920]/60 text-white'
                : 'bg-[#181B1F]/60 border-dashed border-[#23272F] text-[#8E95A2] hover:text-white hover:border-[#3B4250]'
            )}
            aria-expanded={isDocSelectorOpen}
            aria-haspopup="dialog"
            id="attach-documents-btn"
          >
            <Paperclip className="w-3 h-3 text-[#D71920]" />
            <span>{selectedDocs.length > 0 ? '+ Attach more' : 'Attach Document'}</span>
            <ChevronDown
              className={cn(
                'w-3 h-3 text-[#8E95A2] transition-transform duration-150',
                isDocSelectorOpen && 'rotate-180 text-white'
              )}
            />
          </button>

          {/* Document Selection Popover */}
          {isDocSelectorOpen && (
            <div
              ref={popoverRef}
              className="absolute bottom-full left-0 mb-2 w-80 sm:w-96 bg-[#121417] border border-[#23272F] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150 text-[#F3F4F6]"
              role="dialog"
              aria-label="Select Documents"
            >
              {/* Popover Header */}
              <div className="p-3 border-b border-[#23272F] bg-[#181B1F]/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#D71920]" />
                    <span className="text-xs font-semibold text-white">Select Documents</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#8E95A2]">
                    {selectedDocIds.length} attached
                  </span>
                </div>

                {/* Search / Filter Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#5B6270] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={docFilterQuery}
                    onChange={(e) => setDocFilterQuery(e.target.value)}
                    placeholder="Filter documents..."
                    className="w-full bg-[#0E1013] border border-[#23272F] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#5B6270] outline-none focus:border-[#D71920]/60 transition-colors"
                    autoFocus
                  />
                  {docFilterQuery && (
                    <button
                      type="button"
                      onClick={() => setDocFilterQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5B6270] hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Document Selection List */}
              <div className="max-h-60 overflow-y-auto divide-y divide-[#1E2228] p-1.5">
                {filteredAvailableDocs.length > 0 ? (
                  filteredAvailableDocs.map((doc) => {
                    const isSelected = selectedDocIds.includes(doc.id);
                    const isReady = doc.status === 'ready';
                    const isProcessing = doc.status === 'processing';
                    const isFailed = doc.status === 'failed';

                    return (
                      <div
                        key={doc.id}
                        onClick={() => {
                          if (isReady) {
                            toggleDocSelection(doc.id);
                          }
                        }}
                        className={cn(
                          'flex items-center justify-between p-2 rounded-lg transition-colors text-xs',
                          isReady
                            ? 'cursor-pointer hover:bg-[#181B1F]'
                            : 'opacity-50 cursor-not-allowed bg-black/20',
                          isSelected && isReady && 'bg-[#181B1F]/70'
                        )}
                        title={
                          !isReady
                            ? `Document is ${doc.status}. Only processed ready documents can be attached.`
                            : isSelected
                            ? 'Click to remove attachment'
                            : 'Click to attach to conversation'
                        }
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <button
                            type="button"
                            disabled={!isReady}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isReady) {
                                toggleDocSelection(doc.id);
                              }
                            }}
                            className={cn(
                              'shrink-0',
                              isReady ? 'text-[#8E95A2] hover:text-white cursor-pointer' : 'text-[#4A505C] cursor-not-allowed'
                            )}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#D71920]" />
                            ) : (
                              <Square className="w-4 h-4 text-[#5B6270]" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-[#F3F4F6] truncate max-w-[180px] sm:max-w-[210px]">
                                {doc.name}
                              </span>
                              <span
                                className={cn(
                                  'text-[9px] uppercase px-1 rounded border font-mono shrink-0',
                                  getDocTypeBadge(doc.type)
                                )}
                              >
                                {doc.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-[#5B6270] mt-0.5">
                              {doc.pageCount && <span>{doc.pageCount} pgs</span>}
                              {doc.size && <span>{formatBytes(doc.size)}</span>}
                              {isProcessing && (
                                <span className="text-amber-400 flex items-center gap-1">
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" /> Processing ({doc.progress || 0}%)
                                </span>
                              )}
                              {isFailed && (
                                <span className="text-red-400 flex items-center gap-1">
                                  <AlertCircle className="w-2.5 h-2.5" /> Failed
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status / Select Pill */}
                        <div className="shrink-0 text-right">
                          {isReady ? (
                            <span
                              className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors',
                                isSelected
                                  ? 'bg-[#D71920]/20 text-[#FF6B6B] border border-[#D71920]/30'
                                  : 'text-[#8E95A2] hover:text-white'
                              )}
                            >
                              {isSelected ? 'Attached' : 'Attach'}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#5B6270] italic">Not Ready</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-xs text-[#5B6270]">
                    No documents found matching "{docFilterQuery}"
                  </div>
                )}
              </div>

              {/* Popover Footer */}
              <div className="p-2.5 border-t border-[#23272F] bg-[#181B1F]/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const readyIds = allReadyDocs.map((d) => d.id);
                      selectAllDocs(readyIds);
                    }}
                    className="text-[11px] text-[#8E95A2] hover:text-white transition-colors"
                  >
                    Select All Ready
                  </button>
                  <span className="text-[#353B47]">•</span>
                  <button
                    type="button"
                    onClick={clearDocSelection}
                    className="text-[11px] text-[#8E95A2] hover:text-white transition-colors"
                  >
                    Clear
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDocSelectorOpen(false);
                      onOpenDocumentLibrary();
                    }}
                    className="text-[11px] text-[#BAC0CC] hover:text-white inline-flex items-center gap-1 transition-colors"
                    title="Open full document library to upload or manage files"
                  >
                    <span>Full Library</span>
                    <ExternalLink className="w-3 h-3 text-[#5B6270]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDocSelectorOpen(false)}
                    className="px-2.5 py-1 rounded-md bg-[#D71920] hover:bg-[#BF141A] text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hidden native input for direct file picker */}
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept=".pdf,.docx,.txt,.pptx"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Main Input Box */}
      <div
        className={cn(
          'relative bg-[#121417] border rounded-xl transition-all shadow-subtle',
          hasReadyDoc ? 'border-[#23272F] focus-within:border-[#D71920]/70' : 'border-[#23272F]'
        )}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            !hasReadyDoc
              ? 'Attach at least one processed document to begin asking questions...'
              : 'Ask a question about your attached documents... (Shift+Enter for newline)'
          }
          disabled={!hasReadyDoc || isGenerating}
          rows={1}
          className="w-full bg-transparent text-sm text-[#F3F4F6] placeholder-[#5B6270] resize-none outline-none px-4 pt-3.5 pb-2 disabled:cursor-not-allowed disabled:opacity-60 max-h-44 min-h-[44px]"
        />

        {/* Input Footer Controls */}
        <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
          {/* Response Preferences & Attachment Shortcut */}
          <div className="flex items-center gap-1.5">
            {/* Quick Paperclip button inside toolbar */}
            <button
              type="button"
              onClick={() => setIsDocSelectorOpen((prev) => !prev)}
              className={cn(
                'p-1.5 rounded-lg border transition-colors cursor-pointer',
                isDocSelectorOpen
                  ? 'bg-[#D71920]/20 border-[#D71920]/50 text-[#FF6B6B]'
                  : 'bg-[#181B1F] border-[#23272F] text-[#8E95A2] hover:text-white hover:border-[#3B4250]'
              )}
              title="Attach or manage documents"
              aria-label="Toggle document attachment selector"
            >
              <Paperclip className="w-3.5 h-3.5" />
            </button>

            <span className="text-[11px] text-[#5B6270] ml-1 mr-0.5 hidden sm:inline">Depth:</span>
            {preferences.map((p) => {
              const isActive = preference === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPreference(p.key)}
                  className={cn(
                    'px-2 py-0.5 rounded text-[11px] font-medium transition-all',
                    isActive
                      ? 'bg-[#D71920] text-white shadow-sm font-semibold'
                      : 'bg-[#181B1F] text-[#8E95A2] hover:text-[#BAC0CC] border border-[#23272F]'
                  )}
                  title={p.tooltip}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Right Action: Send / Stop */}
          <div className="flex items-center gap-2">
            {isGenerating ? (
              <button
                type="button"
                onClick={stopGeneration}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D71920]/20 text-[#FF6B6B] border border-[#D71920]/40 text-xs font-semibold hover:bg-[#D71920]/30 transition-all animate-pulse"
                title="Stop streaming response"
              >
                <SquareIcon className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!text.trim() || !hasReadyDoc}
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                  text.trim() && hasReadyDoc
                    ? 'bg-[#D71920] text-white hover:bg-[#BF141A] shadow-glow-red active:scale-95 cursor-pointer'
                    : 'bg-[#181B1F] text-[#5B6270] cursor-not-allowed border border-[#23272F]'
                )}
                aria-label="Send query"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Warning message if selected doc is still processing or none selected */}
      {!hasReadyDoc && (
        <div className="flex items-center justify-between text-xs text-amber-400/90 mt-2 px-1">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>
              {selectedDocs.length > 0
                ? 'Selected documents are still processing or failed. Wait for completion or select a ready document.'
                : 'Please attach at least one document to enable AI queries.'}
            </span>
          </div>
          {selectedDocs.length === 0 && (
            <button
              type="button"
              onClick={() => setIsDocSelectorOpen(true)}
              className="text-[#FF6B6B] hover:underline font-medium shrink-0 ml-2"
            >
              Attach now
            </button>
          )}
        </div>
      )}
    </div>
  );
};
