export type DocumentStatus = 'queued' | 'processing' | 'ready' | 'failed';

export type FileType = 'pdf' | 'docx' | 'txt' | 'pptx';

export interface DocumentSnippet {
  pageNumber: number;
  highlightText: string;
  contextText: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  type: FileType;
  size: number; // in bytes
  pageCount: number;
  uploadedAt: number; // timestamp
  status: DocumentStatus;
  progress?: number; // 0-100 when processing
  errorMessage?: string;
  summary?: string;
  sampleSnippets?: DocumentSnippet[];
}

export interface DocumentUploadLimits {
  maxFileSize: number; // 20 MB = 20 * 1024 * 1024
  maxBatchFiles: number; // 10 files
  maxPagesPerDoc: number; // 500 pages
}

export const UPLOAD_LIMITS: DocumentUploadLimits = {
  maxFileSize: 20 * 1024 * 1024,
  maxBatchFiles: 10,
  maxPagesPerDoc: 500,
};

