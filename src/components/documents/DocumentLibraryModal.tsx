import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Search,
  Trash2,
  Edit2,
  RotateCw,
  Eye,
  FileText,
  CheckSquare,
  Square,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  FileSpreadsheet,
  Presentation,
  Check,
  X,
} from 'lucide-react';
import { useDocuments } from '../../context/DocumentContext';
import { DocumentItem, FileType, UPLOAD_LIMITS } from '../../types/document';
import { formatBytes, formatDate } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';

export interface DocumentLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentLibraryModal: React.FC<DocumentLibraryModalProps> = ({ isOpen, onClose }) => {
  const {
    documents,
    selectedDocIds,
    toggleDocSelection,
    selectAllDocs,
    clearDocSelection,
    uploadFiles,
    deleteDocument,
    deleteMultipleDocuments,
    renameDocument,
    retryProcessing,
    openDocumentViewer,
    isUploading,
    uploadProgressMap,
  } = useDocuments();

  const [searchQuery, setSearchQuery] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [newNameInput, setNewNameInput] = useState('');
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<DocumentItem | null>(null);
  const [isBatchDeleteConfirm, setIsBatchDeleteConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered documents by search
  const filteredDocs = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleStartRename = (doc: DocumentItem) => {
    setRenamingDocId(doc.id);
    setNewNameInput(doc.name);
  };

  const handleSaveRename = (docId: string) => {
    if (newNameInput.trim()) {
      renameDocument(docId, newNameInput.trim());
      setRenamingDocId(null);
    }
  };

  const getFileIcon = (type: FileType) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-400" />;
      case 'docx':
        return <FileCode className="w-5 h-5 text-sky-400" />;
      case 'txt':
        return <FileText className="w-5 h-5 text-slate-400" />;
      case 'pptx':
        return <Presentation className="w-5 h-5 text-amber-400" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="4xl"
        title={
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white">Document Library</h3>
            <span className="text-xs bg-[#1E2228] text-[#8E95A2] px-2 py-0.5 rounded-full font-mono">
              {documents.length} files
            </span>
          </div>
        }
        description="Upload, manage, and attach documents for grounding AI question-answering."
      >
        <div className="space-y-6">
          {/* Drag & Drop Upload Surface */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-[#D71920] bg-[#D71920]/5'
                : 'border-[#23272F] hover:border-[#353B47] bg-[#0E1013]/60 hover:bg-[#121417]'
            }`}
          >
            <div className="w-12 h-12 mx-auto rounded-xl bg-[#181B1F] border border-[#23272F] flex items-center justify-center text-[#D71920] mb-3 shadow-sm">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-white mb-1">
              Click to upload or drag & drop documents
            </p>
            <p className="text-xs text-[#8E95A2] mb-3">
              Supported formats: <strong className="text-[#BAC0CC]">PDF, DOCX, TXT, PPTX</strong>
            </p>

            {/* Upload limits banner */}
            <div className="inline-flex flex-wrap items-center justify-center gap-3 text-[11px] text-[#5B6270] bg-[#181B1F]/60 px-3 py-1.5 rounded-lg border border-[#23272F]">
              <span>Max 20 MB per file</span>
              <span>•</span>
              <span>Up to 10 files per batch</span>
              <span>•</span>
              <span>Max 500 pages per doc</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept=".pdf,.docx,.txt,.pptx"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Search & Actions Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="relative flex-1 max-w-sm">
              <Input
                placeholder="Search documents by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>

            <div className="flex items-center gap-2">
              {selectedDocIds.length > 0 && (
                <>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setIsBatchDeleteConfirm(true)}
                    className="text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedDocIds.length})</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearDocSelection}
                    className="text-xs"
                  >
                    Clear Selection
                  </Button>
                </>
              )}

              {selectedDocIds.length === 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    selectAllDocs(documents.filter((d) => d.status === 'ready').map((d) => d.id))
                  }
                  className="text-xs"
                >
                  Select All Ready
                </Button>
              )}
            </div>
          </div>

          {/* Documents Table / List */}
          <div className="border border-[#23272F] rounded-xl overflow-hidden bg-[#0E1013]/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#121417] text-[#8E95A2] font-semibold border-b border-[#23272F]">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="px-4 py-3">Document</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 hidden md:table-cell">Size</th>
                    <th className="px-4 py-3 hidden lg:table-cell">Pages</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Uploaded</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#23272F] text-[#BAC0CC]">
                  {filteredDocs.map((doc) => {
                    const isSelected = selectedDocIds.includes(doc.id);
                    const progress = uploadProgressMap[doc.id] ?? doc.progress;

                    const isReady = doc.status === 'ready';

                    return (
                      <tr
                        key={doc.id}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button, input, a')) return;
                          if (isReady) {
                            toggleDocSelection(doc.id);
                          }
                        }}
                        className={`transition-colors ${
                          isReady ? 'cursor-pointer hover:bg-[#181B1F]/60' : 'opacity-60 cursor-not-allowed bg-[#0E1013]/20'
                        } ${isSelected ? 'bg-[#181B1F]/40' : ''}`}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            disabled={!isReady}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isReady) {
                                toggleDocSelection(doc.id);
                              }
                            }}
                            className={`${
                              isReady ? 'text-[#8E95A2] hover:text-white cursor-pointer' : 'text-[#4A505C] cursor-not-allowed'
                            }`}
                            title={isReady ? (isSelected ? 'Remove document' : 'Attach document') : 'Only processed documents can be selected'}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#D71920]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Title & Type */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="shrink-0">{getFileIcon(doc.type)}</div>
                            <div className="min-w-0 max-w-[220px] sm:max-w-xs md:max-w-sm">
                              {renamingDocId === doc.id ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={newNameInput}
                                    onChange={(e) => setNewNameInput(e.target.value)}
                                    className="bg-[#121417] border border-[#D71920] px-2 py-1 rounded text-xs text-white outline-none w-full"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveRename(doc.id);
                                      if (e.key === 'Escape') setRenamingDocId(null);
                                    }}
                                  />
                                  <button
                                    onClick={() => handleSaveRename(doc.id)}
                                    className="text-emerald-400 hover:text-emerald-300 p-1"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setRenamingDocId(null)}
                                    className="text-[#8E95A2] hover:text-white p-1"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <p className="font-medium text-white truncate">{doc.name}</p>
                                  {doc.summary && (
                                    <p className="text-[11px] text-[#5B6270] truncate mt-0.5">
                                      {doc.summary}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {doc.status === 'ready' && <Badge variant="ready">Ready</Badge>}
                          {doc.status === 'processing' && (
                            <div className="flex items-center gap-1.5">
                              <Badge variant="processing">Processing</Badge>
                              {progress !== undefined && (
                                <span className="text-[11px] font-mono text-amber-400">
                                  {progress}%
                                </span>
                              )}
                            </div>
                          )}
                          {doc.status === 'queued' && <Badge variant="queued">Queued</Badge>}
                          {doc.status === 'failed' && (
                            <div className="flex items-center gap-1.5">
                              <Badge variant="failed">Failed</Badge>
                              <button
                                onClick={() => retryProcessing(doc.id)}
                                className="text-xs text-amber-400 hover:underline inline-flex items-center gap-1"
                                title="Retry processing"
                              >
                                <RotateCw className="w-3 h-3" />
                                <span>Retry</span>
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Size */}
                        <td className="px-4 py-3 text-[#8E95A2] whitespace-nowrap hidden md:table-cell">
                          {formatBytes(doc.size)}
                        </td>

                        {/* Pages */}
                        <td className="px-4 py-3 text-[#8E95A2] whitespace-nowrap hidden lg:table-cell">
                          {doc.pageCount} pgs
                        </td>

                        {/* Upload Date */}
                        <td className="px-4 py-3 text-[#8E95A2] whitespace-nowrap hidden sm:table-cell">
                          {formatDate(doc.uploadedAt)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {/* Preview */}
                            <button
                              onClick={() => {
                                onClose();
                                openDocumentViewer(doc);
                              }}
                              className="p-1.5 text-[#8E95A2] hover:text-white rounded hover:bg-[#181B1F] transition-colors"
                              title="Preview Document"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Rename */}
                            <button
                              onClick={() => handleStartRename(doc)}
                              className="p-1.5 text-[#8E95A2] hover:text-white rounded hover:bg-[#181B1F] transition-colors"
                              title="Rename Document"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => setDeleteConfirmDoc(doc)}
                              className="p-1.5 text-[#8E95A2] hover:text-red-400 rounded hover:bg-red-500/10 transition-colors"
                              title="Delete Document"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredDocs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-[#5B6270]">
                        <p className="text-sm">No documents found matching your filter.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-[#23272F]">
            <p className="text-xs text-[#8E95A2]">
              {selectedDocIds.length} document{selectedDocIds.length === 1 ? '' : 's'} attached to current workspace.
            </p>
            <Button variant="primary" size="sm" onClick={onClose}>
              Done & Return to Chat
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Single Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmDoc !== null}
        onClose={() => setDeleteConfirmDoc(null)}
        title="Confirm Document Deletion"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                Delete "{deleteConfirmDoc?.name}"?
              </p>
              <p className="text-xs text-[#8E95A2] mt-1 leading-relaxed">
                This will permanently remove the document from your library and delete its corresponding vector embeddings.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#23272F]">
            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmDoc(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (deleteConfirmDoc) {
                  deleteDocument(deleteConfirmDoc.id);
                  setDeleteConfirmDoc(null);
                }
              }}
            >
              Delete Document
            </Button>
          </div>
        </div>
      </Modal>

      {/* Batch Delete Confirmation Modal */}
      <Modal
        isOpen={isBatchDeleteConfirm}
        onClose={() => setIsBatchDeleteConfirm(false)}
        title="Confirm Multiple Deletions"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                Delete {selectedDocIds.length} selected document(s)?
              </p>
              <p className="text-xs text-[#8E95A2] mt-1 leading-relaxed">
                All selected files will be removed from your library. This action cannot be reversed.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#23272F]">
            <Button variant="ghost" size="sm" onClick={() => setIsBatchDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                deleteMultipleDocuments(selectedDocIds);
                setIsBatchDeleteConfirm(false);
              }}
            >
              Delete All Selected
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

