import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DocumentItem } from '../types/document';
import { documentService } from '../services/documentService';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface DocumentContextValue {
  documents: DocumentItem[];
  selectedDocIds: string[];
  activePreviewDoc: DocumentItem | null;
  activePreviewPage: number;
  activeHighlight: string | null;
  isUploading: boolean;
  uploadProgressMap: Record<string, number>;
  refreshDocuments: () => void;
  toggleDocSelection: (id: string) => void;
  selectAllDocs: (ids: string[]) => void;
  clearDocSelection: () => void;
  uploadFiles: (files: File[]) => Promise<DocumentItem[] | null>;
  deleteDocument: (id: string) => boolean;
  deleteMultipleDocuments: (ids: string[]) => number;
  renameDocument: (id: string, newName: string) => boolean;
  retryProcessing: (id: string) => void;
  openDocumentViewer: (doc: DocumentItem, pageNumber?: number, highlightText?: string) => void;
  closeDocumentViewer: () => void;
}

const DocumentContext = createContext<DocumentContextValue | undefined>(undefined);

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [activePreviewDoc, setActivePreviewDoc] = useState<DocumentItem | null>(null);
  const [activePreviewPage, setActivePreviewPage] = useState<number>(1);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgressMap, setUploadProgressMap] = useState<Record<string, number>>({});

  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const refreshDocuments = useCallback(async () => {
    if (!isAuthenticated) {
      setDocuments([]);
      return;
    }
    const docs = await documentService.fetchRemoteDocuments();
    setDocuments([...docs]);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      documentService.clearLocalCache();
      setDocuments([]);
      setSelectedDocIds([]);
      setActivePreviewDoc(null);
      setActivePreviewPage(1);
      setActiveHighlight(null);
    } else {
      refreshDocuments();
    }
  }, [isAuthenticated, refreshDocuments]);

  const toggleDocSelection = (id: string) => {
    const doc = documents.find((d) => d.id === id);
    if (doc && doc.status !== 'ready' && !selectedDocIds.includes(id)) {
      showToast(
        'Document Not Ready',
        `"${doc.name}" is ${doc.status}. Only processed ready documents can be attached.`,
        'warning'
      );
      return;
    }
    setSelectedDocIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const selectAllDocs = (ids: string[]) => {
    const readyIds = ids.filter((id) => {
      const doc = documents.find((d) => d.id === id);
      return doc ? doc.status === 'ready' : true;
    });
    setSelectedDocIds(readyIds);
  };

  const clearDocSelection = () => {
    setSelectedDocIds([]);
  };

  const uploadFiles = async (files: File[]): Promise<DocumentItem[] | null> => {
    const validation = documentService.validateFiles(files);
    if (!validation.valid) {
      showToast('Upload Validation Failed', validation.errors[0], 'error');
      return null;
    }

    setIsUploading(true);
    showToast('Uploading Documents', `Processing ${files.length} document(s)...`, 'info');

    try {
      const created = await documentService.uploadDocuments(files, (docId, progress, status) => {
        setUploadProgressMap((prev) => ({ ...prev, [docId]: progress }));
        refreshDocuments();

        if (status === 'ready') {
          setSelectedDocIds((prev) => (prev.includes(docId) ? prev : [...prev, docId]));
          showToast('Document Ready', 'Semantic indexing completed successfully.', 'success');
        }
      });

      refreshDocuments();
      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      showToast('Upload Error', msg, 'error');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteDocument = (id: string): boolean => {
    const doc = documents.find((d) => d.id === id);
    const success = documentService.deleteDocument(id);
    if (success) {
      setSelectedDocIds((prev) => prev.filter((dId) => dId !== id));
      if (activePreviewDoc?.id === id) {
        closeDocumentViewer();
      }
      refreshDocuments();
      showToast('Document Deleted', `"${doc?.name || 'File'}" was removed.`, 'info');
      return true;
    }
    return false;
  };

  const deleteMultipleDocuments = (ids: string[]): number => {
    const count = documentService.deleteMultipleDocuments(ids);
    setSelectedDocIds((prev) => prev.filter((dId) => !ids.includes(dId)));
    refreshDocuments();
    showToast('Documents Deleted', `${count} document(s) removed.`, 'info');
    return count;
  };

  const renameDocument = (id: string, newName: string): boolean => {
    const success = documentService.renameDocument(id, newName);
    if (success) {
      refreshDocuments();
      showToast('Document Renamed', `Updated to "${newName}"`, 'success');
      return true;
    }
    return false;
  };

  const retryProcessing = (id: string) => {
    showToast('Retrying Analysis', 'Re-submitting document to parser queue...', 'info');
    documentService.retryProcessing(id, (docId, progress, status) => {
      setUploadProgressMap((prev) => ({ ...prev, [docId]: progress }));
      refreshDocuments();
      if (status === 'ready') {
        showToast('Document Ingested', 'Document re-processed and ready for QA.', 'success');
      }
    });
    refreshDocuments();
  };

  const openDocumentViewer = (doc: DocumentItem, pageNumber = 1, highlightText?: string) => {
    setActivePreviewDoc(doc);
    setActivePreviewPage(pageNumber);
    setActiveHighlight(highlightText || null);
  };

  const closeDocumentViewer = () => {
    setActivePreviewDoc(null);
    setActiveHighlight(null);
  };

  return (
    <DocumentContext.Provider
      value={{
        documents,
        selectedDocIds,
        activePreviewDoc,
        activePreviewPage,
        activeHighlight,
        isUploading,
        uploadProgressMap,
        refreshDocuments,
        toggleDocSelection,
        selectAllDocs,
        clearDocSelection,
        uploadFiles,
        deleteDocument,
        deleteMultipleDocuments,
        renameDocument,
        retryProcessing,
        openDocumentViewer,
        closeDocumentViewer,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocuments = () => {
  const ctx = useContext(DocumentContext);
  if (!ctx) throw new Error('useDocuments must be used within DocumentProvider');
  return ctx;
};

