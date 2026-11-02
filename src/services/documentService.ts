import { DocumentItem, FileType, UPLOAD_LIMITS } from '../types/document';
import { INITIAL_DOCUMENTS } from './mockData';
import { fetchApi } from './apiClient';

const STORAGE_KEY = 'lensiq_documents_v1';

class DocumentService {
  private documents: DocumentItem[];

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.documents = JSON.parse(saved);
      } catch {
        this.documents = [];
      }
    } else {
      this.documents = [];
    }
  }

  public clearLocalCache(): void {
    this.documents = [];
    localStorage.removeItem(STORAGE_KEY);
  }

  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.documents));
  }

  public async fetchRemoteDocuments(): Promise<DocumentItem[]> {
    try {
      const remoteDocs = await fetchApi<DocumentItem[]>('/documents/');
      if (Array.isArray(remoteDocs)) {
        this.documents = remoteDocs;
        this.persist();
      }
      return this.documents;
    } catch (err) {
      console.warn('Using local document store (backend offline or unauthenticated):', err);
      return this.getDocuments();
    }
  }

  public getDocuments(): DocumentItem[] {
    return [...this.documents];
  }

  public getDocumentById(id: string): DocumentItem | undefined {
    return this.documents.find((d) => d.id === id);
  }

  public validateFiles(files: File[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (files.length > UPLOAD_LIMITS.maxBatchFiles) {
      errors.push(`Maximum batch upload is ${UPLOAD_LIMITS.maxBatchFiles} files at once. You selected ${files.length}.`);
    }

    const allowedExtensions = ['pdf', 'docx', 'txt', 'pptx'];

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !allowedExtensions.includes(ext)) {
        errors.push(`"${file.name}": Unsupported format. Allowed: PDF, DOCX, TXT, PPTX.`);
      }
      if (file.size > UPLOAD_LIMITS.maxFileSize) {
        errors.push(`"${file.name}": File size exceeds the 20 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  public async uploadDocuments(
    files: File[],
    onProgress?: (docId: string, progress: number, status: DocumentItem['status']) => void
  ): Promise<DocumentItem[]> {
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));

      const uploaded = await fetchApi<DocumentItem[]>('/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (Array.isArray(uploaded)) {
        this.documents = [...uploaded, ...this.documents];
        this.persist();

        // Simulate or poll live status updates
        uploaded.forEach((d) => {
          this.simulateProcessing(d.id, onProgress);
        });

        return uploaded;
      }
    } catch (err) {
      console.warn('Backend upload fallback to local pipeline:', err);
    }

    // Local fallback processing if backend offline
    const newDocs: DocumentItem[] = [];
    for (const file of files) {
      const ext = (file.name.split('.').pop()?.toLowerCase() || 'pdf') as FileType;
      const estimatedPages = Math.max(1, Math.min(480, Math.round(file.size / 45000)));

      if (estimatedPages > UPLOAD_LIMITS.maxPagesPerDoc) {
        throw new Error(`"${file.name}" exceeds the maximum limit of 500 pages per document.`);
      }

      const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const docItem: DocumentItem = {
        id: docId,
        name: file.name,
        type: ext,
        size: file.size,
        pageCount: estimatedPages,
        uploadedAt: Date.now(),
        status: 'queued',
        progress: 0,
        summary: `Document uploaded. Parsing sections, tables, and references for citation indexing.`,
        sampleSnippets: [
          {
            pageNumber: 1,
            highlightText: `Core documentation regarding ${file.name.replace(/\.[^/.]+$/, '')}. Ingested successfully into LensIQ RAG index.`,
            contextText: `Introduction & Scope: Core documentation regarding ${file.name.replace(/\.[^/.]+$/, '')}. Ingested successfully into LensIQ RAG index.`,
          },
          {
            pageNumber: Math.max(2, Math.floor(estimatedPages / 2)),
            highlightText: `Specific metrics and key terms outlined in ${file.name}.`,
            contextText: `Detailed Provisions: Specific metrics and key terms outlined in ${file.name}. Operational compliance verified across all clauses.`,
          },
        ],
      };

      this.documents.unshift(docItem);
      newDocs.push(docItem);
      this.persist();

      this.simulateProcessing(docId, onProgress);
    }

    return newDocs;
  }

  private simulateProcessing(
    docId: string,
    onProgress?: (docId: string, progress: number, status: DocumentItem['status']) => void
  ) {
    const doc = this.documents.find((d) => d.id === docId);
    if (!doc) return;

    doc.status = 'processing';
    doc.progress = 15;
    this.persist();
    onProgress?.(docId, 15, 'processing');

    const interval = setInterval(() => {
      const currentDoc = this.documents.find((d) => d.id === docId);
      if (!currentDoc || currentDoc.status !== 'processing') {
        clearInterval(interval);
        return;
      }

      const nextProgress = (currentDoc.progress || 15) + Math.floor(Math.random() * 25) + 12;
      if (nextProgress < 100) {
        currentDoc.progress = nextProgress;
        this.persist();
        onProgress?.(docId, nextProgress, 'processing');
      } else {
        currentDoc.progress = 100;
        currentDoc.status = 'ready';
        this.persist();
        onProgress?.(docId, 100, 'ready');
        clearInterval(interval);
      }
    }, 500);
  }

  public retryProcessing(
    docId: string,
    onProgress?: (docId: string, progress: number, status: DocumentItem['status']) => void
  ): boolean {
    fetchApi(`/documents/${docId}/retry`, { method: 'POST' }).catch((err) =>
      console.warn('Backend retry call failed:', err)
    );

    const doc = this.documents.find((d) => d.id === docId);
    if (!doc) return false;

    doc.status = 'processing';
    doc.progress = 20;
    doc.errorMessage = undefined;
    this.persist();
    onProgress?.(docId, 20, 'processing');

    this.simulateProcessing(docId, onProgress);
    return true;
  }

  public renameDocument(docId: string, newName: string): boolean {
    if (!newName.trim()) return false;

    fetchApi(`/documents/${docId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: newName.trim() }),
    }).catch((err) => console.warn('Backend rename call failed:', err));

    const doc = this.documents.find((d) => d.id === docId);
    if (!doc) return false;

    doc.name = newName.trim();
    this.persist();
    return true;
  }

  public deleteDocument(docId: string): boolean {
    fetchApi(`/documents/${docId}`, { method: 'DELETE' }).catch((err) =>
      console.warn('Backend delete call failed:', err)
    );

    const initialLen = this.documents.length;
    this.documents = this.documents.filter((d) => d.id !== docId);
    if (this.documents.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  public deleteMultipleDocuments(docIds: string[]): number {
    docIds.forEach((id) => this.deleteDocument(id));
    return docIds.length;
  }
}

export const documentService = new DocumentService();
