import React from 'react';
import {
  ArrowRight,
  ShieldCheck,
  TableProperties,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { Button } from '../ui/Button';

export interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onSignIn }) => {
  return (
    <div className="min-h-screen bg-[#0B0C0E] text-[#F3F4F6] flex flex-col selection:bg-[#D71920]/30 selection:text-white">
      {/* Top Navigation */}
      <header className="h-16 border-b border-[#23272F] px-4 sm:px-8 flex items-center justify-between sticky top-0 bg-[#0B0C0E]/90 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#D71920] flex items-center justify-center font-bold text-white text-base shadow-glow-red">
            L
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-lg tracking-tight text-white">LensIQ</span>
              <span className="text-[10px] bg-[#1E2228] text-[#8E95A2] px-1.5 py-0.2 rounded font-mono hidden sm:inline">Document Q&A</span>
            </div>
            <span className="text-[10px] text-[#8E95A2]">The Ambitious Lens Studio by uvRaj</span>
          </div>
        </div>

        <nav className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onSignIn}>
            Sign In
          </Button>
          <Button variant="primary" size="sm" onClick={onGetStarted}>
            <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-8 py-14 sm:py-20 flex flex-col items-center text-center">
        {/* Studio Attribution Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#181B1F] border border-[#23272F] text-xs text-[#BAC0CC] mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span className="w-2 h-2 rounded-full bg-[#D71920]" />
          <span>A product by <strong className="text-white">The Ambitious Lens Studio by uvRaj</strong></span>
          <ChevronRight className="w-3 h-3 text-[#5B6270]" />
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-[1.1] mb-6">
          Document Intelligence with <span className="text-[#FF4A50]">Zero-Hallucination</span> Citations.
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-[#8E95A2] max-w-2xl leading-relaxed mb-10">
          Upload PDF, DOCX, TXT, or PPTX files. Ask complex questions and receive accurate AI syntheses anchored directly to verifiable source passages and page coordinates.
        </p>

        {/* Primary CTA Group */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto mb-16">
          <Button
            size="lg"
            variant="primary"
            onClick={onGetStarted}
            className="w-full sm:w-auto text-base px-8 h-12 shadow-glow-red"
          >
            <span>Launch LensIQ Workspace</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={onSignIn}
            className="w-full sm:w-auto text-base px-6 h-12"
          >
            <span>Sign In to Existing Workspace</span>
          </Button>
        </div>

        {/* Interactive Preview Mock Card */}
        <div className="w-full rounded-2xl bg-[#121417] border border-[#23272F] shadow-modal overflow-hidden text-left mb-20">
          {/* Mock Window Bar */}
          <div className="h-10 bg-[#0E1013] border-b border-[#23272F] px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/60" />
              <span className="w-3 h-3 rounded-full bg-amber-500/60" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
              <span className="text-xs text-[#5B6270] font-mono ml-2">Q3_2025_Financial_Performance_Report.pdf</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              Citation: Verified Passage
            </span>
          </div>

          <div className="p-6 sm:p-8 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-[#181B1F] border border-[#23272F] flex items-center justify-center text-xs font-semibold text-white">
                You
              </div>
              <div className="bg-[#181B1F] border border-[#23272F] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white">
                What was the gross revenue for Q3 2025 and what drove the growth?
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#D71920] flex items-center justify-center text-white text-xs font-bold shrink-0">
                L
              </div>
              <div className="bg-[#0B0C0E] border border-[#23272F] rounded-xl p-4 text-xs sm:text-sm text-[#BAC0CC] flex-1 space-y-2">
                <p>
                  According to the <strong className="text-white">Q3 Financial Report</strong>, gross revenue reached <strong className="text-white">$128.4 Million</strong>, reflecting a <strong className="text-emerald-400">+24.2% YoY</strong> expansion <span className="bg-[#D71920]/20 text-[#FF6B6B] border border-[#D71920]/40 px-1.5 py-0.5 rounded text-[11px] font-bold">[1]</span>.
                </p>
                <div className="mt-3 pt-3 border-t border-[#23272F] flex items-center gap-2">
                  <span className="text-[11px] text-[#5B6270]">Source Anchor:</span>
                  <span className="text-[11px] text-[#FF6B6B] font-mono bg-[#181B1F] px-2 py-0.5 rounded border border-[#23272F]">
                    Page 4 • Section 1.2 Executive Summary
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-16">
          <div className="p-6 rounded-2xl bg-[#121417] border border-[#23272F] hover:border-[#D71920]/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#181B1F] border border-[#23272F] flex items-center justify-center text-[#D71920] mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Verifiable Citations</h3>
            <p className="text-xs text-[#8E95A2] leading-relaxed">
              Every factual assertion links to precise page numbers and highlighted passage overlays. Click any badge to jump directly into the source document.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#121417] border border-[#23272F] hover:border-[#D71920]/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#181B1F] border border-[#23272F] flex items-center justify-center text-sky-400 mb-4">
              <Eye className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Split-Screen PDF Viewer</h3>
            <p className="text-xs text-[#8E95A2] leading-relaxed">
              Read and inspect documents side-by-side with your AI chat stream. Seamless page navigation, zoom controls, and passage highlighting.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#121417] border border-[#23272F] hover:border-[#D71920]/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#181B1F] border border-[#23272F] flex items-center justify-center text-emerald-400 mb-4">
              <TableProperties className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Structured Extraction</h3>
            <p className="text-xs text-[#8E95A2] leading-relaxed">
              Define custom attributes or let AI suggest columns. Extract structured tabular records from multi-document collections with CSV and XLSX export.
            </p>
          </div>
        </div>

        {/* Free Tier Limits Highlight */}
        <div className="w-full p-6 rounded-2xl bg-[#121417] border border-[#23272F] flex flex-col sm:flex-row items-center justify-between gap-6 text-left">
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Phase 1 Free Plan Limits</h4>
            <p className="text-xs text-[#8E95A2]">
              20 questions/day • 10 document uploads/day • 100 MB document storage • Up to 500 pages per file.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={onGetStarted} className="shrink-0">
            Start Exploring Now
          </Button>
        </div>
      </main>

      {/* Footer with Studio Attribution */}
      <footer className="border-t border-[#23272F] py-8 text-center text-xs text-[#5B6270]">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 The Ambitious Lens Studio by uvRaj. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-[#8E95A2]">LensIQ Document Intelligence</span>
            <span>•</span>
            <span className="text-[#8E95A2]">Deterministic Citations</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
