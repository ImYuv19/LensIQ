import React, { useState } from 'react';
import {
  Copy,
  Check,
  RotateCw,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  User,
  FileText,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { ChatMessage, Citation } from '../../types/chat';
import { useDocuments } from '../../context/DocumentContext';
import { useToast } from '../../context/ToastContext';
import { cn } from '../../lib/utils';

export interface MessageItemProps {
  message: ChatMessage;
  onRegenerate?: () => void;
  onSelectFollowUp?: (query: string) => void;
  onSetFeedback?: (messageId: string, feedback: 'like' | 'dislike' | null) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onRegenerate,
  onSelectFollowUp,
  onSetFeedback,
}) => {
  const [copied, setCopied] = useState(false);
  const { openDocumentViewer, documents } = useDocuments();
  const { showToast } = useToast();

  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    showToast('Copied to clipboard', 'Response text copied.', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCitationClick = (citationIndex: number) => {
    if (!message.citations || !message.citations[citationIndex]) return;
    const citation = message.citations[citationIndex];
    const doc = documents.find((d) => d.id === citation.docId);
    if (doc) {
      openDocumentViewer(doc, citation.pageNumber, citation.highlightText);
    } else {
      showToast(
        'Document Unavailable',
        `Referenced document "${citation.docName}" has been deleted from your library. Historical chat answers remain preserved.`,
        'warning'
      );
    }
  };

  // Basic markdown parser for headings, tables, code blocks, lists, bold, and citations [[1]]
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = () => {
      if (tableRows.length > 0) {
        const header = tableRows[0];
        const bodyRows = tableRows.slice(1).filter((r) => !r.every((c) => c.includes('---') || c.trim() === ''));
        elements.push(
          <div key={`table_${elements.length}`} className="my-3 overflow-x-auto rounded-lg border border-[#23272F]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#181B1F] text-[#F3F4F6] font-semibold border-b border-[#23272F]">
                <tr>
                  {header.map((col, idx) => (
                    <th key={idx} className="px-3.5 py-2.5">
                      {col.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23272F] text-[#BAC0CC]">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-[#181B1F]/60 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3.5 py-2.5">
                        {renderInlineFormatting(cell.trim())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
        inTable = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre
              key={`code_${elements.length}`}
              className="p-3.5 my-3 rounded-lg bg-[#0B0C0E] border border-[#23272F] font-mono text-xs text-[#E6EDF3] overflow-x-auto"
            >
              <code>{codeBlockContent.join('\n')}</code>
            </pre>
          );
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          flushTable();
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Markdown Tables
      if (line.startsWith('|') && line.endsWith('|')) {
        inTable = true;
        const cells = line
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        tableRows.push(cells);
        continue;
      } else if (inTable) {
        flushTable();
      }

      // Headings
      if (line.startsWith('#### ')) {
        elements.push(
          <h4 key={i} className="text-sm font-semibold text-white mt-4 mb-2">
            {renderInlineFormatting(line.replace('#### ', ''))}
          </h4>
        );
        continue;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={i} className="text-base font-semibold text-white mt-4 mb-2 tracking-tight">
            {renderInlineFormatting(line.replace('### ', ''))}
          </h3>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={i} className="text-lg font-bold text-white mt-5 mb-2.5">
            {renderInlineFormatting(line.replace('## ', ''))}
          </h2>
        );
        continue;
      }

      // Blockquotes
      if (line.startsWith('> ')) {
        elements.push(
          <blockquote
            key={i}
            className="my-3 pl-3.5 border-l-2 border-[#D71920] text-xs text-[#BAC0CC] italic bg-[#181B1F]/40 py-1 rounded-r-md"
          >
            {renderInlineFormatting(line.replace('> ', ''))}
          </blockquote>
        );
        continue;
      }

      // Bullet points
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        elements.push(
          <li key={i} className="text-sm text-[#BAC0CC] ml-4 list-disc leading-relaxed my-1">
            {renderInlineFormatting(line.trim().substring(2))}
          </li>
        );
        continue;
      }

      // Numbered lists
      const numberedMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
      if (numberedMatch) {
        elements.push(
          <li key={i} className="text-sm text-[#BAC0CC] ml-4 list-decimal leading-relaxed my-1">
            {renderInlineFormatting(numberedMatch[2])}
          </li>
        );
        continue;
      }

      // Standard paragraphs
      if (line.trim()) {
        elements.push(
          <p key={i} className="text-sm text-[#BAC0CC] leading-relaxed my-2">
            {renderInlineFormatting(line)}
          </p>
        );
      }
    }

    if (inTable) {
      flushTable();
    }

    return elements;
  };

  // Replaces bold **text**, inline code `code`, and citations [[1]], [[2]]
  const renderInlineFormatting = (text: string) => {
    // Regex splits on citations [[1]], [[2]]
    const parts = text.split(/(\[\[\d+\]\])/g);

    return parts.map((part, pIdx) => {
      const citMatch = part.match(/\[\[(\d+)\]\]/);
      if (citMatch) {
        const citationNum = parseInt(citMatch[1], 10);
        const citationIndex = citationNum - 1;
        const citObj = message.citations?.[citationIndex];

        return (
          <button
            key={pIdx}
            onClick={() => handleCitationClick(citationIndex)}
            className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.2 rounded bg-[#D71920]/15 text-[#FF6B6B] hover:bg-[#D71920]/30 border border-[#D71920]/30 text-[11px] font-semibold transition-all hover:scale-105"
            title={citObj ? `${citObj.docName} (Page ${citObj.pageNumber}) - Click to preview` : 'Source Citation'}
          >
            <span>[{citationNum}]</span>
          </button>
        );
      }

      // Replace bold and code in remaining strings
      return <span key={pIdx} dangerouslySetInnerHTML={{ __html: sanitizeMarkdownText(part) }} />;
    });
  };

  const sanitizeMarkdownText = (str: string) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-[#BAC0CC]">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-[#0B0C0E] border border-[#23272F] px-1.5 py-0.5 rounded font-mono text-xs text-[#FF6B6B]">$1</code>');
  };

  return (
    <div className={cn('py-5 transition-colors select-text', isUser ? 'bg-transparent' : 'bg-[#121417]/50 border-y border-[#181B1F]')}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex gap-4">
          {/* Avatar */}
          <div className="shrink-0 mt-0.5">
            {isUser ? (
              <div className="w-8 h-8 rounded-full bg-[#181B1F] border border-[#23272F] flex items-center justify-center text-[#8E95A2]">
                <User className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#D71920] flex items-center justify-center text-white font-bold text-sm shadow-glow-red">
                <Sparkles className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* Content Body */}
          <div className="flex-1 min-w-0">
            {/* Header info */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-white">
                {isUser ? 'You' : 'LensIQ Assistant'}
              </span>
              {message.preference && (
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-[#181B1F] text-[#8E95A2] border border-[#23272F]">
                  {message.preference}
                </span>
              )}
            </div>

            {/* Main message text */}
            <div className="text-sm leading-relaxed text-[#F3F4F6]">
              {renderFormattedContent(message.content)}
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-[#D71920] animate-pulse align-middle" />
              )}
            </div>

            {/* Citations Card Tray */}
            {message.citations && message.citations.length > 0 && (
              <div className="mt-5 pt-4 border-t border-[#23272F]">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8E95A2] mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#D71920]" />
                  <span>Source Citations ({message.citations.length})</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {message.citations.map((cit, idx) => {
                    const isDocAvailable = documents.some((d) => d.id === cit.docId);

                    return (
                      <button
                        key={cit.id}
                        onClick={() => handleCitationClick(idx)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all text-left group ${
                          isDocAvailable
                            ? 'bg-[#181B1F] border-[#23272F] hover:border-[#D71920]/50 hover:bg-[#1E2228]'
                            : 'bg-[#181B1F]/60 border-dashed border-[#23272F] opacity-75'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                            isDocAvailable
                              ? 'bg-[#D71920]/15 text-[#FF6B6B]'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-medium text-white truncate group-hover:text-white">
                              {cit.docName}
                            </p>
                            {!isDocAvailable && (
                              <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 border border-amber-500/20 px-1 rounded shrink-0">
                                Unavailable
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#8E95A2] mt-0.5">
                            Page {cit.pageNumber} • Supporting Passage
                          </p>
                          <p className="text-[11px] text-[#5B6270] line-clamp-1 italic mt-1 group-hover:text-[#BAC0CC] transition-colors">
                            "{cit.highlightText}"
                          </p>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-[#5B6270] group-hover:text-[#D71920] shrink-0 transition-colors" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Follow-up suggestions */}
            {message.followUps && message.followUps.length > 0 && !message.isStreaming && (
              <div className="mt-4 pt-3 border-t border-[#23272F]/50">
                <p className="text-[11px] text-[#8E95A2] mb-2 font-medium">Suggested Next Inquiries:</p>
                <div className="flex flex-wrap gap-1.5">
                  {message.followUps.map((suggestion, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => onSelectFollowUp?.(suggestion)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181B1F] border border-[#23272F] hover:border-[#D71920]/40 hover:bg-[#1E2228] text-xs text-[#BAC0CC] hover:text-white transition-all text-left"
                    >
                      <span>{suggestion}</span>
                      <ChevronRight className="w-3 h-3 text-[#5B6270]" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Response action buttons */}
            {!isUser && !message.isStreaming && (
              <div className="flex items-center gap-2 mt-4 pt-2">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-[#8E95A2] hover:text-white hover:bg-[#181B1F] transition-colors"
                  title="Copy full text"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-[#8E95A2] hover:text-white hover:bg-[#181B1F] transition-colors"
                    title="Regenerate this response"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Regenerate</span>
                  </button>
                )}

                <div className="h-3 w-[1px] bg-[#23272F] mx-1" />

                <button
                  onClick={() => onSetFeedback?.(message.id, message.feedback === 'like' ? null : 'like')}
                  className={cn(
                    'p-1.5 rounded text-xs transition-colors',
                    message.feedback === 'like'
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-[#8E95A2] hover:text-white hover:bg-[#181B1F]'
                  )}
                  title="Accurate and helpful"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onSetFeedback?.(message.id, message.feedback === 'dislike' ? null : 'dislike')}
                  className={cn(
                    'p-1.5 rounded text-xs transition-colors',
                    message.feedback === 'dislike'
                      ? 'text-red-400 bg-red-500/10'
                      : 'text-[#8E95A2] hover:text-white hover:bg-[#181B1F]'
                  )}
                  title="Contains inaccuracies"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

