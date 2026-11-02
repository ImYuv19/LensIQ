import React, { useState } from 'react';
import {
  TableProperties,
  Sparkles,
  Plus,
  Trash2,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  FileText,
  ExternalLink,
  ChevronRight,
  Loader2,
  X,
  FileDown,
} from 'lucide-react';
import { useDocuments } from '../../context/DocumentContext';
import { useToast } from '../../context/ToastContext';
import { ExtractionColumn, ExtractionJob } from '../../types/extraction';
import { extractionService, DEFAULT_SUGGESTED_COLUMNS } from '../../services/extractionService';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export interface SpreadsheetExtractionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SpreadsheetExtractionModal: React.FC<SpreadsheetExtractionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { documents, openDocumentViewer } = useDocuments();
  const { showToast } = useToast();

  const readyDocs = documents.filter((d) => d.status === 'ready');

  // Step state
  const [step, setStep] = useState<'configure' | 'extracting' | 'preview'>('configure');

  // Configuration state
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(
    readyDocs.slice(0, 3).map((d) => d.id)
  );
  const [jobTitle, setJobTitle] = useState('Quarterly Audit Extraction');
  const [columns, setColumns] = useState<ExtractionColumn[]>([...DEFAULT_SUGGESTED_COLUMNS]);
  const [extractionMode, setExtractionMode] = useState<'single_row' | 'multi_row'>('single_row');

  // New column inputs
  const [newColLabel, setNewColLabel] = useState('');
  const [newColType, setNewColType] = useState<'text' | 'number' | 'date' | 'currency'>('text');

  // Extraction running state
  const [progress, setProgress] = useState(0);
  const [resultJob, setResultJob] = useState<ExtractionJob | null>(null);

  const handleToggleDoc = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleAddColumn = () => {
    if (!newColLabel.trim()) return;
    const colKey = newColLabel.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newCol: ExtractionColumn = {
      id: `col_${Date.now()}`,
      key: colKey,
      label: newColLabel.trim(),
      type: newColType,
    };
    setColumns((prev) => [...prev, newCol]);
    setNewColLabel('');
  };

  const handleRemoveColumn = (colId: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== colId));
  };

  const handleAiSuggestColumns = () => {
    const suggested = extractionService.suggestColumnsForDocuments(selectedDocIds);
    setColumns(suggested);
    showToast('Columns Suggested', `AI suggested ${suggested.length} relevant columns based on selected files.`, 'success');
  };

  const handleStartExtraction = async () => {
    if (selectedDocIds.length === 0) {
      showToast('Document Required', 'Select at least one ready document to extract from.', 'warning');
      return;
    }
    if (columns.length === 0) {
      showToast('Columns Required', 'Add at least one column definition.', 'warning');
      return;
    }

    setStep('extracting');
    setProgress(10);

    try {
      const job = await extractionService.runExtraction(
        `job_${Date.now()}`,
        jobTitle,
        selectedDocIds,
        columns,
        extractionMode,
        (p) => setProgress(p)
      );

      setResultJob(job);
      setStep('preview');
      showToast('Extraction Completed', `Structured dataset generated (${extractionMode === 'multi_row' ? 'Multiple records per document' : 'One row per document'}).`, 'success');
    } catch {
      setStep('configure');
      showToast('Extraction Failed', 'Unable to complete table extraction.', 'error');
    }
  };

  const handleExportCsv = () => {
    if (!resultJob) return;
    extractionService.exportJobToCsv(resultJob);
    showToast('Exported CSV', 'Spreadsheet CSV downloaded.', 'success');
  };

  const handleExportXlsx = () => {
    if (!resultJob) return;
    extractionService.exportJobToXlsx(resultJob);
    showToast('Exported Excel', 'Excel workbook downloaded.', 'success');
  };

  const handleCellCitationClick = (docId: string, pageNumber?: number, highlightText?: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (doc) {
      openDocumentViewer(doc, pageNumber || 1, highlightText);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="5xl"
      title={
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-[#D71920]/15 text-[#D71920]">
              <TableProperties className="w-4 h-4" />
            </div>
            <span className="text-base font-semibold text-white">
              Structured Spreadsheet Extraction
            </span>
          </div>
          <span className="text-[10px] text-[#8E95A2] ml-7 font-mono">
            The Ambitious Lens Studio by uvRaj
          </span>
        </div>
      }
      description="Extract schema-defined parameters from multiple documents into a verifiable tabular dataset."
    >
      <div className="space-y-6">
        {/* STEP 1: CONFIGURE */}
        {step === 'configure' && (
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-[#BAC0CC] mb-1.5">Extraction Task Name</label>
              <Input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Master Services Agreement Audit 2026"
              />
            </div>

            {/* Document Selection Grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[#BAC0CC]">
                  1. Select Source Documents ({selectedDocIds.length} chosen)
                </label>
                <span className="text-[11px] text-[#5B6270]">Only processed 'Ready' documents are selectable</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {readyDocs.map((doc) => {
                  const isChecked = selectedDocIds.includes(doc.id);
                  return (
                    <div
                      key={doc.id}
                      onClick={() => handleToggleDoc(doc.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                        isChecked
                          ? 'bg-[#181B1F] border-[#D71920]/60 ring-1 ring-[#D71920]/30'
                          : 'bg-[#121417] border-[#23272F] hover:bg-[#181B1F]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 accent-[#D71920] rounded"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white truncate">{doc.name}</p>
                        <p className="text-[10px] text-[#8E95A2]">
                          {doc.type.toUpperCase()} • {doc.pageCount} pages
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Record Density / Multi-Row Control */}
            <div className="pt-2 border-t border-[#23272F]">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#BAC0CC]">
                  2. Extraction Record Density
                </label>
                <span className="text-[11px] text-[#8E95A2]">Default: One row per document</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExtractionMode('single_row')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    extractionMode === 'single_row'
                      ? 'bg-[#181B1F] border-[#D71920] text-white ring-1 ring-[#D71920]/40'
                      : 'bg-[#121417] border-[#23272F] text-[#8E95A2] hover:bg-[#181B1F]'
                  }`}
                >
                  <p className="text-xs font-semibold">One Row Per Document</p>
                  <p className="text-[11px] text-[#8E95A2] mt-0.5">Aggregates all extracted attributes into a single summary record per file.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setExtractionMode('multi_row')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    extractionMode === 'multi_row'
                      ? 'bg-[#181B1F] border-[#D71920] text-white ring-1 ring-[#D71920]/40'
                      : 'bg-[#121417] border-[#23272F] text-[#8E95A2] hover:bg-[#181B1F]'
                  }`}
                >
                  <p className="text-xs font-semibold">Multiple Records Per Document</p>
                  <p className="text-[11px] text-[#8E95A2] mt-0.5">Generates multiple rows for distinct clauses, sections, or matching records.</p>
                </button>
              </div>
            </div>

            {/* Column Schema Definition */}
            <div className="pt-2 border-t border-[#23272F]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                <div>
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                    3. Define Extraction Columns
                  </h4>
                  <p className="text-xs text-[#8E95A2]">
                    Specify the target attributes LensIQ will extract across each document.
                  </p>
                </div>

                {/* AI Column Suggestion Trigger */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAiSuggestColumns}
                  className="text-xs border-[#D71920]/40 text-white hover:bg-[#D71920]/10"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#D71920]" />
                  <span>AI Suggest Columns</span>
                </Button>
              </div>

              {/* Column list chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                {columns.map((col) => (
                  <div
                    key={col.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#181B1F] border border-[#23272F] text-xs text-white"
                  >
                    <span className="font-medium">{col.label}</span>
                    <span className="text-[10px] uppercase font-mono text-[#5B6270] bg-[#121417] px-1 rounded">
                      {col.type || 'text'}
                    </span>
                    <button
                      onClick={() => handleRemoveColumn(col.id)}
                      className="text-[#8E95A2] hover:text-red-400 ml-1"
                      title="Remove column"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add custom column input row */}
              <div className="flex items-center gap-2 max-w-lg">
                <Input
                  placeholder="New column name (e.g. Governing Law)"
                  value={newColLabel}
                  onChange={(e) => setNewColLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                />
                <select
                  value={newColType}
                  onChange={(e) => setNewColType(e.target.value as any)}
                  className="bg-[#121417] text-xs text-[#BAC0CC] rounded-lg border border-[#23272F] px-2.5 py-2 outline-none"
                >
                  <option value="text">Text</option>
                  <option value="currency">Currency</option>
                  <option value="date">Date</option>
                  <option value="number">Number</option>
                </select>
                <Button size="sm" variant="secondary" onClick={handleAddColumn}>
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </Button>
              </div>
            </div>

            {/* Configure Action Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-[#23272F]">
              <span className="text-xs text-[#8E95A2]">
                Extracts {columns.length} columns from {selectedDocIds.length} document(s).
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleStartExtraction}
                  disabled={selectedDocIds.length === 0 || columns.length === 0}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Start Extraction</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: EXTRACTING PROGRESS */}
        {step === 'extracting' && (
          <div className="py-16 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#D71920]/15 text-[#D71920] mx-auto flex items-center justify-center animate-pulse">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <h4 className="text-base font-semibold text-white">Extracting Structured Data...</h4>
            <p className="text-xs text-[#8E95A2] max-w-sm mx-auto">
              Synthesizing passages across {selectedDocIds.length} documents and mapping attributes into specified columns.
            </p>

            <div className="max-w-md mx-auto w-full bg-[#181B1F] rounded-full h-2 overflow-hidden border border-[#23272F]">
              <div
                className="bg-[#D71920] h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="font-mono text-xs text-[#8E95A2]">{progress}% Completed</span>
          </div>
        )}

        {/* STEP 3: PREVIEW RESULT & EXPORT */}
        {step === 'preview' && resultJob && (
          <div className="space-y-5">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-white">{resultJob.title}</h4>
                <p className="text-xs text-[#8E95A2]">
                  {resultJob.rows.length} rows generated • {extractionMode === 'multi_row' ? 'Multiple records per document' : 'One row per document'} • Click cell reference tags to jump to cited page.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setStep('configure')}>
                  Modify Schema
                </Button>
                <Button variant="secondary" size="sm" onClick={handleExportCsv}>
                  <FileDown className="w-3.5 h-3.5 text-[#D71920]" />
                  <span>Export CSV</span>
                </Button>
                <Button variant="primary" size="sm" onClick={handleExportXlsx}>
                  <Download className="w-3.5 h-3.5" />
                  <span>Export XLSX (.xlsx)</span>
                </Button>
              </div>
            </div>

            {/* Results Table */}
            <div className="border border-[#23272F] rounded-xl overflow-hidden bg-[#0E1013]/60">
              <div className="overflow-x-auto max-h-[50vh]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#181B1F] text-white font-semibold border-b border-[#23272F] sticky top-0 z-10">
                    <tr>
                      <th className="px-3.5 py-3 border-r border-[#23272F] min-w-[180px]">
                        Document Source
                      </th>
                      {resultJob.columns.map((col) => (
                        <th
                          key={col.id}
                          className="px-3.5 py-3 border-r border-[#23272F] min-w-[160px]"
                        >
                          <div>
                            <span>{col.label}</span>
                            <span className="block text-[10px] font-normal text-[#5B6270] uppercase font-mono">
                              {col.type || 'text'}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#23272F] text-[#BAC0CC]">
                    {resultJob.rows.map((row) => (
                      <tr key={row.id} className="hover:bg-[#181B1F]/60 transition-colors">
                        <td className="px-3.5 py-3 border-r border-[#23272F] font-medium text-white">
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-[#D71920] shrink-0" />
                            <span className="truncate max-w-[160px]">{row.docName}</span>
                          </div>
                        </td>

                        {resultJob.columns.map((col) => {
                          const cell = row.cells[col.key];
                          const isMissing = cell?.isMissing;

                          return (
                            <td
                              key={col.id}
                              className={`px-3.5 py-3 border-r border-[#23272F] align-top ${
                                isMissing ? 'bg-black/20 text-[#5B6270] italic' : ''
                              }`}
                            >
                              <div className="space-y-1">
                                <span className={isMissing ? 'text-[#5B6270]' : 'text-[#F3F4F6]'}>
                                  {cell?.value || '—'}
                                </span>

                                {/* Source Document Reference badge */}
                                {cell?.pageReference && (
                                  <button
                                    onClick={() =>
                                      handleCellCitationClick(
                                        cell.docId,
                                        cell.pageReference,
                                        cell.highlightText
                                      )
                                    }
                                    className="block text-[10px] text-[#FF6B6B] hover:underline font-mono"
                                    title="View cited passage in document viewer"
                                  >
                                    Page {cell.pageReference} ↗
                                  </button>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Note on data integrity */}
            <div className="flex items-center justify-between text-xs text-[#5B6270] pt-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Missing attributes are marked Unavailable, strictly preventing hallucinations.
              </span>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

