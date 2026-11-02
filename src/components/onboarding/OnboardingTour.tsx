import React, { useState } from 'react';
import {
  UploadCloud,
  FileCheck2,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: '1. Upload your documents',
      subtitle: 'Multi-Format Ingestion Engine',
      desc: 'Drag and drop contracts, reports, manuals, or slides (PDF, DOCX, TXT, PPTX). LensIQ parses and indexes text with optical clarity while maintaining cryptographic data security.',
      icon: <UploadCloud className="w-6 h-6 text-sky-400" />,
    },
    {
      title: '2. Select documents for a conversation',
      subtitle: 'Targeted Grounding Context',
      desc: 'Attach one or more processed documents to ground your inquiry. LensIQ enforces a strict readiness guarantee: queries only execute when verified documents anchor the knowledge retrieval.',
      icon: <FileCheck2 className="w-6 h-6 text-[#D71920]" />,
    },
    {
      title: '3. Ask questions with supporting citations',
      subtitle: 'Zero Hallucinations Guarantee',
      desc: 'Receive accurate AI answers directly tied to source coordinates. Click any citation tag ([1], [2]) to view the split-screen PDF reader with the exact supporting passage highlighted.',
      icon: <MessageSquare className="w-6 h-6 text-emerald-400" />,
    },
  ];

  const step = steps[currentStep];

  const handleFinish = () => {
    localStorage.setItem('lensiq_onboarding_completed', 'true');
    onClose();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleFinish} maxWidth="md">
      <div className="py-2 text-center space-y-5">
        {/* Studio Attribution Banner */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#181B1F] border border-[#23272F] text-[11px] text-[#BAC0CC]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D71920]" />
          <span>The Ambitious Lens Studio by uvRaj</span>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-1.5">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentStep ? 'w-8 bg-[#D71920]' : 'w-2 bg-[#23272F]'
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#181B1F] border border-[#23272F] flex items-center justify-center shadow-subtle">
          {step.icon}
        </div>

        {/* Content */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#D71920]">
            Step {currentStep + 1} of {steps.length}
          </span>
          <h3 className="text-lg font-bold text-white tracking-tight">{step.title}</h3>
          <p className="text-xs font-semibold text-[#BAC0CC]">{step.subtitle}</p>
          <p className="text-xs text-[#8E95A2] leading-relaxed max-w-sm mx-auto pt-1">
            {step.desc}
          </p>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-[#23272F]">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSkip}
              className="text-xs text-[#8E95A2] hover:text-white px-2 py-1 rounded transition-colors"
            >
              Skip Tour
            </button>

            {currentStep > 0 && (
              <Button variant="ghost" size="sm" onClick={handlePrev} className="text-xs">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </Button>
            )}
          </div>

          <Button variant="primary" size="sm" onClick={handleNext} className="text-xs">
            {currentStep === steps.length - 1 ? (
              <>
                <span>Get Started</span>
                <Check className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Next Step</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
