export interface ExtractionColumn {
  id: string;
  key: string;
  label: string;
  description?: string;
  type?: 'text' | 'number' | 'date' | 'currency';
}

export interface ExtractionCell {
  columnKey: string;
  value: string;
  isMissing?: boolean;
  docId: string;
  docName: string;
  pageReference?: number;
  highlightText?: string;
}

export interface ExtractionRow {
  id: string;
  docId: string;
  docName: string;
  cells: Record<string, ExtractionCell>;
}

export interface ExtractionJob {
  id: string;
  title: string;
  selectedDocIds: string[];
  columns: ExtractionColumn[];
  rows: ExtractionRow[];
  createdAt: number;
  status: 'idle' | 'running' | 'completed' | 'failed';
  exportFormat?: 'csv' | 'xlsx';
}

