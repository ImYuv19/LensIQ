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
  Loader2,
  AlertCircle,
  Eye,
  FileCode,
  RotateCw,
} from 'lucide-react';
import { useDocuments } from '../../context/DocumentContext';
import { fetchApi, fetchBlob } from '../../services/apiClient';
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
  const [totalPages, setTotalPages] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [pageImageUrl, setPageImageUrl] = useState<string | null>(null);
  const [pageMeta, setPageMeta] = useState<{
    text?: string;
    total_pages?: number;
    highlight_matches?: number;
    rects?: Array<{ x: number; y: number; w: number; h: number }>;
  } | null>(null);
  const [rawTextContent, setRawTextContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTextLayer, setShowTextLayer] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Sync to citation page when activePreviewPage changes
  useEffect(() => {
    if (activePreviewPage && activePreviewPage > 0) {
      setCurrentPage(activePreviewPage);
    }
  }, [activePreviewPage]);

  // Load real document page image or text from backend
  useEffect(() => {
    if (!activePreviewDoc) return;
    let isCancelled = false;
    let createdUrl: string | null = null;

    const loadContent = async () => {
      setIsLoading(true);
      setErrorMsg(null);

      try {
        if (activePreviewDoc.type === 'pdf') {
          // 1. Fetch rendered high-fidelity original page image from backend PyMuPDF renderer
          const highlightParam = activeHighlight
            ? `?highlight=${encodeURIComponent(activeHighlight)}&dpi=150`
            : '?dpi=150';

          const blob = await fetchBlob(
            `/documents/${activePreviewDoc.id}/page/${currentPage}${highlightParam}`
          );
          if (isCancelled) return;
          createdUrl = URL.createObjectURL(blob);
          setPageImageUrl(createdUrl);

          // 2. Fetch page metadata (exact page count, page text, bounding boxes)
          const metaParam = activeHighlight ? `?highlight=${encodeURIComponent(activeHighlight)}` : '';
          const meta = await fetchApi<any>(
            `/documents/${activePreviewDoc.id}/page/${currentPage}/meta${metaParam}`
          );
          if (isCancelled) return;
          if (meta.total_pages) {
            setTotalPages(meta.total_pages);
          }
          setPageMeta(meta);
        } else {
          // Plain text / other format: fetch raw content from backend vault
          const text = await fetchApi<string>(`/documents/${activePreviewDoc.id}/preview`);
          if (isCancelled) return;
          setRawTextContent(typeof text === 'string' ? text : JSON.stringify(text, null, 2));
          setTotalPages(1);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Error loading original document page:', err);
          setErrorMsg(err.message || 'Unable to load original document from backend storage.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadContent();

    return () => {
      isCancelled = true;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [activePreviewDoc?.id, currentPage, activeHighlight]);

  if (!activePreviewDoc) return null;

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
    setZoomLevel((prev) => Math.max(60, prev - 15));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  const handleDownloadOriginal = async () => {
    if (!activePreviewDoc || isDownloading) return;
    setIsDownloading(true);
    try {
      const blob = await fetchBlob(`/documents/${activePreviewDoc.id}/preview`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = activePreviewDoc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download original failed:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className={`flex flex-col bg-[#0B0C0E] border-l border-[#23272F] z-30 transition-all duration-200 select-none ${
        isFullscreen
          ? 'fixed inset-0 z-50'
          : isSplitView
          ? 'w-full md:w-[48%] lg:w-[50%] h-full'
          : 'fixed inset-y-0 right-0 w-full sm:w-[540px] md:w-[620px] shadow-2xl'
      }`}
    >
      {/* Top Header / Toolbar */}
      <div className="h-14 px-4 bg-[#121417] border-b border-[#23272F] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
          <div className="p-1.5 rounded-lg bg-[#181B1F] border border-[#23272F] text-[#D71920] shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate" title={activePreviewDoc.name}>
              {activePreviewDoc.name}
            </p>
            <p className="text-[10px] text-[#8E95A2] flex items-center gap-1.5">
              <span>{formatBytes(activePreviewDoc.size)}</span>
              <span>•</span>
              <span className="uppercase text-emerald-400 font-semibold">{activePreviewDoc.type}</span>
              <span>•</span>
              <span className="text-[#5B6270]">Original File</span>
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Download Original File Button */}
          <button
            onClick={handleDownloadOriginal}
            disabled={isDownloading}
            className="p-1.5 text-[#8E95A2] hover:text-white rounded hover:bg-[#181B1F] transition-colors"
            title="Download Original File from Storage"
          >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin text-[#D71920]" /> : <Download className="w-4 h-4" />}
          </button>

          {/* Text Layer Toggle (for inspection / copy) */}
          <button
            onClick={() => setShowTextLayer(!showTextLayer)}
            className={`p-1.5 rounded transition-colors ${
              showTextLayer
                ? 'bg-[#D71920]/20 text-[#FF6B6B] border border-[#D71920]/40'
                : 'text-[#8E95A2] hover:text-white hover:bg-[#181B1F]'
            }`}
            title={showTextLayer ? 'Hide Text Transcript' : 'Inspect Raw Page Text'}
          >
            <FileCode className="w-4 h-4" />
          </button>

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
            disabled={currentPage <= 1 || isLoading}
            className="p-1 text-[#8E95A2] hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded hover:bg-[#181B1F] transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-mono text-white text-[11px]">
            Page <strong className="text-white font-bold">{currentPage}</strong> of {totalPages}
          </span>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages || isLoading}
            className="p-1 text-[#8E95A2] hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded hover:bg-[#181B1F] transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {activeHighlight && (
          <div className="flex items-center gap-1.5 text-[#FF6B6B] bg-[#D71920]/15 px-2.5 py-0.5 rounded text-[11px] font-semibold border border-[#D71920]/30 shadow-sm animate-pulse">
            <Highlighter className="w-3 h-3 text-[#D71920]" />
            <span>Citation Highlighted (Page {currentPage})</span>
          </div>
        )}
      </div>

      {/* Main Document Canvas */}
      <div className="flex-1 overflow-auto p-3 sm:p-6 bg-[#0B0C0E] flex flex-col items-center relative">
        {/* Loading Spinner */}
        {isLoading && (
          <div className="my-auto flex flex-col items-center justify-center p-8 text-center">
            <Loader2 className="w-8 h-8 text-[#D71920] animate-spin mb-3" />
            <p className="text-xs font-medium text-white mb-1">
              Rendering Page {currentPage} from Original Document...
            </p>
            <p className="text-[11px] text-[#8E95A2]">
              Executing high-fidelity PyMuPDF layout rasterization
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMsg && (
          <div className="my-auto max-w-sm p-4 bg-[#181B1F] border border-red-500/30 rounded-xl text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-white mb-1">Document Load Error</p>
            <p className="text-[11px] text-[#8E95A2] mb-3">{errorMsg}</p>
            <button
              onClick={() => setCurrentPage((p) => p)}
              className="px-3 py-1 bg-[#D71920] hover:bg-[#BF141A] text-white text-xs rounded-md transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* PDF Page Image View */}
        {!isLoading && !errorMsg && activePreviewDoc.type === 'pdf' && pageImageUrl && (
          <div className="flex flex-col items-center w-full">
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              className="relative shadow-2xl rounded-sm transition-transform duration-100 max-w-full my-2"
            >
              <img
                src={pageImageUrl}
                alt={`Page ${currentPage} of ${activePreviewDoc.name}`}
                className="max-w-none w-auto h-auto rounded border border-[#23272F] shadow-modal block select-text bg-white"
                style={{
                  maxHeight: isFullscreen ? 'calc(100vh - 140px)' : '780px',
                  objectFit: 'contain',
                }}
              />
            </div>

            {/* Cited Passage Bottom Context Bar */}
            {activeHighlight && (
              <div className="w-full max-w-xl mt-4 p-3.5 bg-[#121417] border border-[#D71920]/40 rounded-xl shadow-modal">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#FF6B6B] uppercase tracking-wider mb-1.5">
                  <Highlighter className="w-3.5 h-3.5 text-[#D71920]" />
                  <span>Cited Source Passage (Page {currentPage})</span>
                </div>
                <blockquote className="text-xs text-[#F3F4F6] italic bg-[#181B1F] p-2.5 rounded-lg border-l-2 border-[#D71920]">
                  "{activeHighlight}"
                </blockquote>
              </div>
            )}
          </div>
        )}

        {/* Plain Text Document View */}
        {!isLoading && !errorMsg && activePreviewDoc.type !== 'pdf' && rawTextContent && (
          <div
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            className="w-full max-w-2xl bg-[#121417] border border-[#23272F] rounded-xl shadow-modal p-6 transition-transform duration-100 select-text"
          >
            <div className="border-b border-[#23272F] pb-3 mb-4 flex items-center justify-between">
              <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">
                Original Text File Content
              </span>
              <span className="text-[11px] font-mono text-[#8E95A2]">
                {rawTextContent.length} characters
              </span>
            </div>

            {activeHighlight && (
              <div className="mb-4 p-3 rounded-lg bg-[#D71920]/10 border border-[#D71920]/30">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#FF6B6B] uppercase mb-1">
                  <Highlighter className="w-3.5 h-3.5 text-[#D71920]" />
                  <span>Cited Highlight</span>
                </div>
                <p className="text-xs text-white font-medium italic">"{activeHighlight}"</p>
              </div>
            )}

            <pre className="font-mono text-xs text-[#BAC0CC] whitespace-pre-wrap leading-relaxed select-text">
              {rawTextContent}
            </pre>
          </div>
        )}

        {/* Collapsible Raw Page Text Inspection Drawer */}
        {showTextLayer && pageMeta?.text && (
          <div className="w-full max-w-xl mt-4 p-4 bg-[#14161A] border border-[#23272F] rounded-xl text-left select-text">
            <div className="flex items-center justify-between border-b border-[#23272F] pb-2 mb-2">
              <span className="text-[11px] font-mono text-[#8E95A2] uppercase tracking-wider">
                Raw Extracted Text (Page {currentPage})
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(pageMeta.text || '')}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-mono"
              >
                Copy Text
              </button>
            </div>
            <pre className="text-xs text-[#BAC0CC] whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-auto">
              {pageMeta.text}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
