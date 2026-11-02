import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  FileText,
  Highlighter,
  Download,
  Split,
} from 'lucide-react';
import { useDocuments } from '../../context/DocumentContext';
import { Button } from '../ui/Button';
import { formatBytes } from '../../lib/utils';

export interface DocumentViewerProps {
  isSplitView?: boolean;
  onToggleSplitView?: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  isSplitView = false,
  onToggleSplitView,
}) => {
  const { activePreviewDoc, activePreviewPage, activeHighlight, closeDocumentViewer } = useDocuments();

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (activePreviewPage) {
      setCurrentPage(activePreviewPage);
    }
  }, [activePreviewPage]);

  if (!activePreviewDoc) return null;

  const totalPages = activePreviewDoc.pageCount || 1;

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(180, prev + 15));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(70, prev - 15));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  // Find snippet matching this page if any
  const matchedSnippet = activePreviewDoc.sampleSnippets?.find(
    (s) => s.pageNumber === currentPage
  );

  return (
    <div
      className={`flex flex-col bg-[#0B0C0E] border-l border-[#23272F] z-30 transition-all duration-200 select-none ${
        isFullscreen
          ? 'fixed inset-0 z-50'
          : isSplitView
          ? 'w-full md:w-[48%] lg:w-[50%] h-full'
          : 'fixed inset-y-0 right-0 w-full sm:w-[520px] md:w-[600px] shadow-2xl'
      }`}
    >
      {/* Top Header / Toolbar */}
      <div className="h-14 px-4 bg-[#121417] border-b border-[#23272F] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
          <div className="p-1.5 rounded-lg bg-[#181B1F] border border-[#23272F] text-[#D71920] shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{activePreviewDoc.name}</p>
            <p className="text-[10px] text-[#8E95A2]">
              {formatBytes(activePreviewDoc.size)} • {activePreviewDoc.type.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-[#181B1F] border border-[#23272F] rounded-lg px-1 py-0.5">
            <button
              onClick={handleZoomOut}
              className="p-1 text-[#8E95A2] hover:text-white rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="text-[11px] font-mono text-[#BAC0CC] px-1 hover:text-white"
              title="Reset Zoom"
            >
              {zoomLevel}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1 text-[#8E95A2] hover:text-white rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Toggle Split / Fullscreen */}
          {onToggleSplitView && !isFullscreen && (
            <button
              onClick={onToggleSplitView}
              className="hidden md:flex p-1.5 text-[#8E95A2] hover:text-white rounded hover:bg-[#181B1F] transition-colors"
              title={isSplitView ? 'Switch to Overlay' : 'Split View with Chat'}
            >
              <Split className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-[#8E95A2] hover:text-white rounded hover:bg-[#181B1F] transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={closeDocumentViewer}
            className="p-1.5 text-[#8E95A2] hover:text-white rounded hover:bg-[#181B1F] transition-colors ml-1"
            title="Close Viewer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Page Navigation Banner */}
      <div className="h-10 px-4 bg-[#0E1013] border-b border-[#23272F] flex items-center justify-between text-xs text-[#8E95A2] shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1 text-[#8E95A2] hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded hover:bg-[#181B1F]"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-mono text-white">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="p-1 text-[#8E95A2] hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded hover:bg-[#181B1F]"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {activeHighlight && matchedSnippet && (
          <div className="flex items-center gap-1.5 text-[#FF6B6B] bg-[#D71920]/10 px-2 py-0.5 rounded text-[11px] font-medium border border-[#D71920]/20">
            <Highlighter className="w-3 h-3" />
            <span>Citation Highlighted</span>
          </div>
        )}
      </div>

      {/* Main Document Simulation Canvas */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 bg-[#0B0C0E] flex items-center justify-center">
        <div
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          className="w-full max-w-xl min-h-[640px] bg-[#121417] border border-[#23272F] rounded-xl shadow-modal p-6 sm:p-8 flex flex-col justify-between transition-transform duration-100 select-text"
        >
          {/* Simulated PDF Header */}
          <div>
            <div className="flex items-center justify-between border-b border-[#23272F] pb-3 mb-6">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#5B6270]">
                LensIQ Ingestion Engine • Section #{currentPage}
              </span>
              <span className="text-[10px] font-mono text-[#5B6270]">DOC_ID: {activePreviewDoc.id}</span>
            </div>

            <h3 className="text-lg font-bold text-white mb-4 tracking-tight">
              {activePreviewDoc.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')}
            </h3>

            {/* Document Body Text Simulation */}
            <div className="space-y-4 text-xs sm:text-sm text-[#BAC0CC] leading-relaxed">
              <p>
                Document registered under enterprise retention policy. All terms, clauses, and quantitative schedules have been indexed into high-dimensional vector representations.
              </p>

              {/* Cited Passage Highlight Container */}
              {matchedSnippet ? (
                <div className="my-4 p-4 rounded-lg bg-[#181B1F] border-l-4 border-[#D71920] shadow-sm relative">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#FF6B6B] uppercase tracking-wider mb-2">
                    <Highlighter className="w-3.5 h-3.5 text-[#D71920]" />
                    <span>Exact Source Citation Anchor (Page {matchedSnippet.pageNumber})</span>
                  </div>
                  <p className="text-sm font-medium text-white leading-relaxed bg-[#D71920]/20 px-2 py-1 rounded inline">
                    "{matchedSnippet.highlightText}"
                  </p>
                  <p className="text-xs text-[#8E95A2] mt-2 italic">
                    Context: {matchedSnippet.contextText}
                  </p>
                </div>
              ) : (
                <div className="my-4 p-4 rounded-lg bg-[#14161A] border border-[#23272F] text-xs text-[#8E95A2] leading-relaxed">
                  <p className="font-mono text-[11px] text-[#5B6270] mb-2 uppercase tracking-wider">
                    Paragraph Cluster #{currentPage * 3 - 2} to #{currentPage * 3}
                  </p>
                  <p>
                    Standard operational paragraphs extracted from raw file buffer. For page {currentPage}, the document details administrative procedures, performance benchmarks, and compliance verifications.
                  </p>
                </div>
              )}

              <p>
                Authorized personnel may reference these schedules across cross-departmental reviews. LensIQ maintains strict cryptographic parity with source documents.
              </p>
            </div>
          </div>

          {/* Page Footer */}
          <div className="border-t border-[#23272F] pt-3 mt-8 flex items-center justify-between text-[11px] text-[#5B6270]">
            <span>CONFIDENTIAL & PROPRIETARY</span>
            <span>Page {currentPage} of {totalPages}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

