import React from 'react';
import { FileText, Sparkles, TableProperties, ShieldCheck, ArrowRight, UploadCloud } from 'lucide-react';
import { useDocuments } from '../../context/DocumentContext';
import { Button } from '../ui/Button';

export interface WelcomeStateProps {
  onSelectPrompt: (prompt: string) => void;
  onOpenDocuments: () => void;
}

export const WelcomeState: React.FC<WelcomeStateProps> = ({ onSelectPrompt, onOpenDocuments }) => {
  const { documents, selectedDocIds } = useDocuments();
  const readyDocs = documents.filter((d) => d.status === 'ready');
  const hasSelectedReadyDoc = selectedDocIds.some((id) =>
    readyDocs.some((d) => d.id === id)
  );

  const samplePrompts = [
    {
      title: 'Analyze Financial Performance',
      desc: 'What was the gross revenue and YoY growth reported for Q3 2025?',
      query: 'What was the gross revenue and YoY growth reported for Q3 2025?',
    },
    {
      title: 'Review SLA & Liability Terms',
      desc: 'What is the contractual uptime SLA and aggregate liability cap?',
      query: 'What is the contractual uptime guarantee and the total aggregate liability limitation?',
    },
    {
      title: 'Technical Vector Indexing',
      desc: 'How does chunking and hybrid BM25 reciprocal rank fusion work?',
      query: 'How does the chunk size normalization and BM25 Reciprocal Rank Fusion function?',
    },
    {
      title: 'Employee Benefits Summary',
      desc: 'What are the annual learning stipends and parental leave policies?',
      query: 'What are the annual learning stipends and parental leave policies outlined?',
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-3xl mx-auto w-full text-center select-none animate-in fade-in duration-300">
      {/* Brand Icon */}
      <div className="w-14 h-14 rounded-2xl bg-[#181B1F] border border-[#23272F] flex items-center justify-center mb-4 shadow-subtle relative group">
        <div className="w-8 h-8 rounded-lg bg-[#D71920] flex items-center justify-center font-bold text-white text-lg">
          L
        </div>
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-[#0B0C0E]" />
      </div>

      {/* Studio Attribution */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#181B1F] border border-[#23272F] text-[11px] text-[#BAC0CC] mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-[#D71920]" />
        <span>The Ambitious Lens Studio by uvRaj</span>
      </div>

      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
        LensIQ Document Intelligence
      </h2>
      <p className="text-sm text-[#8E95A2] max-w-lg mb-8 leading-relaxed">
        Upload contracts, reports, or research papers. Ask direct questions and receive accurate AI answers backed by verifiable source citations.
      </p>

      {/* Document Readiness Alert */}
      {!hasSelectedReadyDoc && (
        <div className="w-full bg-[#181B1F] border border-[#23272F] rounded-xl p-4 mb-8 text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5 sm:mt-0">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Select or Upload a Document to Begin</p>
              <p className="text-xs text-[#8E95A2] mt-0.5">
                Questions require at least one processed document attached to anchor factual citations.
              </p>
            </div>
          </div>
          <Button size="sm" variant="primary" onClick={onOpenDocuments} className="shrink-0">
            Select Documents
          </Button>
        </div>
      )}

      {/* Suggested Starters */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-8">
        {samplePrompts.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(item.query)}
            className="p-3.5 rounded-xl bg-[#121417] border border-[#23272F] hover:border-[#D71920]/40 hover:bg-[#181B1F] transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-[#F3F4F6] group-hover:text-white">
                  {item.title}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#5B6270] group-hover:text-[#D71920] group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xs text-[#8E95A2] line-clamp-2 leading-relaxed">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Key Guarantees */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#5B6270]">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Strict Citation Anchoring</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[#D71920]" />
          <span>Multi-Format Ingestion (PDF, DOCX, TXT)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TableProperties className="w-4 h-4 text-sky-400" />
          <span>Structured Table Extraction</span>
        </div>
      </div>
    </div>
  );
};

