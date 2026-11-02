import * as XLSX from 'xlsx';
import { ExtractionColumn, ExtractionJob, ExtractionRow } from '../types/extraction';
import { documentService } from './documentService';
import { downloadFile } from '../lib/utils';

export const DEFAULT_SUGGESTED_COLUMNS: ExtractionColumn[] = [
  { id: 'col_1', key: 'title', label: 'Document Title', type: 'text', description: 'Primary title or header of the document' },
  { id: 'col_2', key: 'effective_date', label: 'Effective / Report Date', type: 'date', description: 'Official date of document or agreement' },
  { id: 'col_3', key: 'primary_metric', label: 'Core Metric / Financials', type: 'currency', description: 'Total value, revenue, or budget allocation' },
  { id: 'col_4', key: 'sla_commitment', label: 'SLA / Key Commitment', type: 'text', description: 'Target availability, deliverables, or policy cap' },
  { id: 'col_5', key: 'termination_clause', label: 'Termination / Renewal Terms', type: 'text', description: 'Notice period or expiration provisions' },
];

class ExtractionService {
  public suggestColumnsForDocuments(docIds: string[]): ExtractionColumn[] {
    const docs = docIds.map((id) => documentService.getDocumentById(id)).filter(Boolean);
    const hasFinancial = docs.some((d) => d?.name.toLowerCase().includes('fin') || d?.name.toLowerCase().includes('report'));
    const hasLegal = docs.some((d) => d?.name.toLowerCase().includes('agreement') || d?.name.toLowerCase().includes('msa') || d?.name.toLowerCase().includes('service'));

    const cols: ExtractionColumn[] = [
      { id: 'col_title', key: 'title', label: 'Document Title', type: 'text' },
      { id: 'col_date', key: 'effective_date', label: 'Document Date', type: 'date' },
    ];

    if (hasFinancial) {
      cols.push(
        { id: 'col_rev', key: 'gross_revenue', label: 'Gross Revenue / ARR', type: 'currency', description: 'Reported top-line quarterly or annual revenue' },
        { id: 'col_growth', key: 'growth_rate', label: 'YoY Growth Rate', type: 'text', description: 'Year-over-year percentage expansion' },
        { id: 'col_cash', key: 'cash_reserves', label: 'Cash & Equivalents', type: 'currency', description: 'Ending cash balance with zero debt' }
      );
    }

    if (hasLegal) {
      cols.push(
        { id: 'col_sla', key: 'uptime_sla', label: 'Uptime SLA', type: 'text', description: 'Contractual uptime percentage target' },
        { id: 'col_liability', key: 'liability_cap', label: 'Liability Limitation', type: 'text', description: 'Maximum aggregate liability cap' },
        { id: 'col_notice', key: 'termination_notice', label: 'Termination Notice', type: 'text', description: 'Notice requirement days for convenience' }
      );
    }

    if (!hasFinancial && !hasLegal) {
      cols.push(
        { id: 'col_objective', key: 'primary_objective', label: 'Core Scope & Purpose', type: 'text' },
        { id: 'col_benefits', key: 'key_deliverables', label: 'Key Stipends / Metrics', type: 'text' },
        { id: 'col_governance', key: 'governing_standard', label: 'Standards & Compliance', type: 'text' }
      );
    }

    return cols;
  }

  public async runExtraction(
    jobId: string,
    title: string,
    docIds: string[],
    columns: ExtractionColumn[],
    mode: 'single_row' | 'multi_row' = 'single_row',
    onProgress?: (progress: number) => void
  ): Promise<ExtractionJob> {
    const docs = docIds
      .map((id) => documentService.getDocumentById(id))
      .filter((d) => d !== undefined && d.status === 'ready');

    const totalSteps = docs.length;
    const rows: ExtractionRow[] = [];

    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i]!;
      await new Promise((r) => setTimeout(r, 350)); // simulate AI extraction

      if (mode === 'multi_row' && doc.sampleSnippets && doc.sampleSnippets.length > 1) {
        // Multi-row extraction: creates a distinct row for each matching record / clause in the document
        doc.sampleSnippets.forEach((snippet, sIdx) => {
          const cells: ExtractionRow['cells'] = {};

          for (const col of columns) {
            if (col.key === 'title') {
              cells[col.key] = {
                columnKey: col.key,
                value: `${doc.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')} [Record #${sIdx + 1}]`,
                docId: doc.id,
                docName: doc.name,
                pageReference: snippet.pageNumber,
                highlightText: snippet.highlightText,
              };
            } else if (col.key === 'effective_date' || col.key === 'col_date') {
              cells[col.key] = {
                columnKey: col.key,
                value: doc.uploadedAt ? new Date(doc.uploadedAt).toISOString().split('T')[0] : '—',
                docId: doc.id,
                docName: doc.name,
                pageReference: snippet.pageNumber,
                highlightText: `Verified date for Section on Page ${snippet.pageNumber}`,
              };
            } else if (snippet.highlightText.toLowerCase().includes('revenue') || snippet.highlightText.toLowerCase().includes('$128.4')) {
              if (col.key === 'gross_revenue' || col.key === 'primary_metric') {
                cells[col.key] = {
                  columnKey: col.key,
                  value: '$128.4 Million',
                  docId: doc.id,
                  docName: doc.name,
                  pageReference: snippet.pageNumber,
                  highlightText: snippet.highlightText,
                };
              } else if (col.key === 'growth_rate') {
                cells[col.key] = {
                  columnKey: col.key,
                  value: '+24.2% YoY',
                  docId: doc.id,
                  docName: doc.name,
                  pageReference: snippet.pageNumber,
                  highlightText: snippet.highlightText,
                };
              } else {
                cells[col.key] = {
                  columnKey: col.key,
                  value: 'Unavailable',
                  isMissing: true,
                  docId: doc.id,
                  docName: doc.name,
                };
              }
            } else if (snippet.highlightText.toLowerCase().includes('cash') || snippet.highlightText.toLowerCase().includes('$84.5')) {
              if (col.key === 'cash_reserves') {
                cells[col.key] = {
                  columnKey: col.key,
                  value: '$84.5 Million',
                  docId: doc.id,
                  docName: doc.name,
                  pageReference: snippet.pageNumber,
                  highlightText: snippet.highlightText,
                };
              } else {
                cells[col.key] = {
                  columnKey: col.key,
                  value: 'Unavailable',
                  isMissing: true,
                  docId: doc.id,
                  docName: doc.name,
                };
              }
            } else if (snippet.highlightText.toLowerCase().includes('uptime') || snippet.highlightText.toLowerCase().includes('99.95')) {
              if (col.key === 'uptime_sla' || col.key === 'sla_commitment') {
                cells[col.key] = {
                  columnKey: col.key,
                  value: '99.95% Availability',
                  docId: doc.id,
                  docName: doc.name,
                  pageReference: snippet.pageNumber,
                  highlightText: snippet.highlightText,
                };
              } else {
                cells[col.key] = {
                  columnKey: col.key,
                  value: 'Unavailable',
                  isMissing: true,
                  docId: doc.id,
                  docName: doc.name,
                };
              }
            } else if (snippet.highlightText.toLowerCase().includes('terminate') || snippet.highlightText.toLowerCase().includes('sixty')) {
              if (col.key === 'termination_notice' || col.key === 'termination_clause') {
                cells[col.key] = {
                  columnKey: col.key,
                  value: '60 Days Written Notice',
                  docId: doc.id,
                  docName: doc.name,
                  pageReference: snippet.pageNumber,
                  highlightText: snippet.highlightText,
                };
              } else {
                cells[col.key] = {
                  columnKey: col.key,
                  value: 'Unavailable',
                  isMissing: true,
                  docId: doc.id,
                  docName: doc.name,
                };
              }
            } else if (snippet.highlightText.toLowerCase().includes('liability') || snippet.highlightText.toLowerCase().includes('twelve')) {
              if (col.key === 'liability_cap') {
                cells[col.key] = {
                  columnKey: col.key,
                  value: '12 Months Fees Cap',
                  docId: doc.id,
                  docName: doc.name,
                  pageReference: snippet.pageNumber,
                  highlightText: snippet.highlightText,
                };
              } else {
                cells[col.key] = {
                  columnKey: col.key,
                  value: 'Unavailable',
                  isMissing: true,
                  docId: doc.id,
                  docName: doc.name,
                };
              }
            } else {
              cells[col.key] = {
                columnKey: col.key,
                value: 'Unavailable',
                isMissing: true,
                docId: doc.id,
                docName: doc.name,
              };
            }
          }

          rows.push({
            id: `row_${doc.id}_${sIdx}`,
            docId: doc.id,
            docName: doc.name,
            cells,
          });
        });
      } else {
        // Default behaviour: Exactly one row per document
        const cells: ExtractionRow['cells'] = {};

        for (const col of columns) {
          if (col.key === 'title') {
            cells[col.key] = {
              columnKey: col.key,
              value: doc.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
              docId: doc.id,
              docName: doc.name,
              pageReference: 1,
              highlightText: `Extracted from title header in ${doc.name}`,
            };
          } else if (col.key === 'effective_date' || col.key === 'col_date') {
            cells[col.key] = {
              columnKey: col.key,
              value: doc.uploadedAt ? new Date(doc.uploadedAt).toISOString().split('T')[0] : '—',
              docId: doc.id,
              docName: doc.name,
              pageReference: 1,
              highlightText: 'Official filing & submission timestamp',
            };
          } else if (col.key === 'gross_revenue' || col.key === 'primary_metric') {
            if (doc.name.includes('Financial')) {
              cells[col.key] = {
                columnKey: col.key,
                value: '$128.4 Million',
                docId: doc.id,
                docName: doc.name,
                pageReference: 4,
                highlightText: 'Gross revenue for Q3 2025 reached $128.4M, representing a 24.2% year-over-year expansion',
              };
            } else {
              // Missing values represented as blank or unavailable, never fabricated
              cells[col.key] = {
                columnKey: col.key,
                value: 'Unavailable',
                isMissing: true,
                docId: doc.id,
                docName: doc.name,
              };
            }
          } else if (col.key === 'growth_rate') {
            if (doc.name.includes('Financial')) {
              cells[col.key] = {
                columnKey: col.key,
                value: '+24.2% YoY',
                docId: doc.id,
                docName: doc.name,
                pageReference: 4,
                highlightText: '24.2% year-over-year expansion driven by enterprise tier subscriptions',
              };
            } else {
              cells[col.key] = {
                columnKey: col.key,
                value: 'Unavailable',
                isMissing: true,
                docId: doc.id,
                docName: doc.name,
              };
            }
          } else if (col.key === 'cash_reserves') {
            if (doc.name.includes('Financial')) {
              cells[col.key] = {
                columnKey: col.key,
                value: '$84.5 Million',
                docId: doc.id,
                docName: doc.name,
                pageReference: 19,
                highlightText: 'Cash and cash equivalents at the end of the quarter were $84.5 million',
              };
            } else {
              cells[col.key] = {
                columnKey: col.key,
                value: 'Unavailable',
                isMissing: true,
                docId: doc.id,
                docName: doc.name,
              };
            }
          } else if (col.key === 'uptime_sla' || col.key === 'sla_commitment') {
            if (doc.name.includes('Master_Service_Agreement') || doc.name.includes('Vector_Storage')) {
              cells[col.key] = {
                columnKey: col.key,
                value: '99.95% Availability',
                docId: doc.id,
                docName: doc.name,
                pageReference: 3,
                highlightText: 'Service Level Agreement guarantees 99.95% monthly uptime excluding maintenance',
              };
            } else {
              cells[col.key] = {
                columnKey: col.key,
                value: 'Unavailable',
                isMissing: true,
                docId: doc.id,
                docName: doc.name,
              };
            }
          } else if (col.key === 'liability_cap') {
            if (doc.name.includes('Master_Service_Agreement')) {
              cells[col.key] = {
                columnKey: col.key,
                value: '12 Months Fees Cap',
                docId: doc.id,
                docName: doc.name,
                pageReference: 14,
                highlightText: 'Total aggregate liability shall not exceed fees paid in preceding 12 months',
              };
            } else {
              cells[col.key] = {
                columnKey: col.key,
                value: 'Unavailable',
                isMissing: true,
                docId: doc.id,
                docName: doc.name,
              };
            }
          } else if (col.key === 'termination_notice' || col.key === 'termination_clause') {
            if (doc.name.includes('Master_Service_Agreement')) {
              cells[col.key] = {
                columnKey: col.key,
                value: '60 Days Written Notice',
                docId: doc.id,
                docName: doc.name,
                pageReference: 8,
                highlightText: 'Either party may terminate for convenience with sixty (60) days prior written notice',
              };
            } else {
              cells[col.key] = {
                columnKey: col.key,
                value: 'Unavailable',
                isMissing: true,
                docId: doc.id,
                docName: doc.name,
              };
            }
          } else {
            if (doc.sampleSnippets && doc.sampleSnippets.length > 0) {
              cells[col.key] = {
                columnKey: col.key,
                value: doc.sampleSnippets[0].highlightText.substring(0, 45) + '...',
                docId: doc.id,
                docName: doc.name,
                pageReference: doc.sampleSnippets[0].pageNumber,
                highlightText: doc.sampleSnippets[0].highlightText,
              };
            } else {
              cells[col.key] = {
                columnKey: col.key,
                value: 'Unavailable',
                isMissing: true,
                docId: doc.id,
                docName: doc.name,
              };
            }
          }
        }

        rows.push({
          id: `row_${doc.id}`,
          docId: doc.id,
          docName: doc.name,
          cells,
        });
      }

      onProgress?.(Math.round(((i + 1) / totalSteps) * 100));
    }

    return {
      id: jobId,
      title: title || 'Structured Document Extraction',
      selectedDocIds: docIds,
      columns,
      rows,
      createdAt: Date.now(),
      status: 'completed',
    };
  }

  public exportJobToCsv(job: ExtractionJob): void {
    const headers = ['Document Source', ...job.columns.map((c) => c.label)];
    const csvRows = [headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',')];

    for (const row of job.rows) {
      const line = [
        `"${row.docName.replace(/"/g, '""')}"`,
        ...job.columns.map((col) => {
          const cell = row.cells[col.key];
          const val = cell?.value || '';
          return `"${val.replace(/"/g, '""')}"`;
        }),
      ];
      csvRows.push(line.join(','));
    }

    const csvContent = csvRows.join('\n');
    downloadFile(csvContent, `${job.title.toLowerCase().replace(/\s+/g, '_')}_lensiq.csv`, 'text/csv;charset=utf-8;');
  }

  public exportJobToXlsx(job: ExtractionJob): void {
    // Generate valid OpenXML XLSX using SheetJS
    const rowsData = job.rows.map((row) => {
      const rowObj: Record<string, string> = {
        'Document Source': row.docName,
      };
      for (const col of job.columns) {
        rowObj[col.label] = row.cells[col.key]?.value || '';
      }
      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(rowsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'LensIQ Extraction');

    const filename = `${job.title.toLowerCase().replace(/\s+/g, '_')}_lensiq.xlsx`;

    // Generate binary buffer and download as genuine OpenXML XLSX
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const extractionService = new ExtractionService();
