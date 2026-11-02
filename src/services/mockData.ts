import { DocumentItem } from '../types/document';
import { Conversation, ChatMessage } from '../types/chat';
import { UserProfile, PromptVersionInfo } from '../types/user';

export const INITIAL_USER: UserProfile = {
  id: 'usr_default_01',
  name: 'Alex Morgan',
  email: 'alex.morgan@enterprise.ai',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces',
  promptVersion: 'v2',
  joinedAt: Date.now() - 86400000 * 30,
  usage: {
    questionsAskedToday: 6,
    questionsDailyLimit: 20,
    uploadsToday: 3,
    uploadsDailyLimit: 10,
    storageUsedBytes: 24.8 * 1024 * 1024, // 24.8 MB
    storageLimitBytes: 100 * 1024 * 1024, // 100 MB
  },
};

export const PROMPT_VERSIONS: PromptVersionInfo[] = [
  {
    version: 'v1',
    name: 'V1 — Direct Fact Retrieval',
    description: 'Fast, concise answers extracting literal facts and dates directly from the document without discursive commentary.',
  },
  {
    version: 'v2',
    name: 'V2 — Balanced Synthesis (Default)',
    description: 'Our standard production model. Balances thorough explanations, structured formatting, and precise citation links.',
    isDefault: true,
  },
  {
    version: 'v3',
    name: 'V3 — Deep Analytical Breakdown',
    description: 'Comprehensive cross-document comparative analysis with edge-case detection and full context validation.',
  },
];

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc_fin_q3',
    name: 'Q3_2025_Financial_Performance_Report.pdf',
    type: 'pdf',
    size: 4.8 * 1024 * 1024,
    pageCount: 42,
    uploadedAt: Date.now() - 3600000 * 3,
    status: 'ready',
    summary: 'Quarterly financial overview reporting $128.4M gross revenue, 24% YoY ARR growth, and operating margins expansion.',
    sampleSnippets: [
      {
        pageNumber: 4,
        highlightText: 'Gross revenue for Q3 2025 reached $128.4M, representing a 24.2% year-over-year expansion driven by enterprise tier subscriptions.',
        contextText: 'Executive Summary: Overall company trajectory remains resilient despite macroeconomic headwinds. Gross revenue for Q3 2025 reached $128.4M, representing a 24.2% year-over-year expansion driven by enterprise tier subscriptions. Net retention stabilized at 118%.',
      },
      {
        pageNumber: 12,
        highlightText: 'Operating expenditure decreased by 4.8% due to cloud infrastructure consolidation and automated support routing.',
        contextText: 'Cost Optimization Initiatives: Operating expenditure decreased by 4.8% due to cloud infrastructure consolidation and automated support routing. Free cash flow for the nine-month period stands at $31.2M.',
      },
      {
        pageNumber: 19,
        highlightText: 'Cash and cash equivalents at the end of the quarter were $84.5 million, with zero short-term debt covenants.',
        contextText: 'Liquidity and Balance Sheet Health: Cash and cash equivalents at the end of the quarter were $84.5 million, with zero short-term debt covenants. Capital expenditures for Q4 are projected at $6.5M.',
      },
    ],
  },
  {
    id: 'doc_tos_saas',
    name: 'Enterprise_Master_Service_Agreement_v4.docx',
    type: 'docx',
    size: 1.2 * 1024 * 1024,
    pageCount: 18,
    uploadedAt: Date.now() - 86400000 * 1,
    status: 'ready',
    summary: 'Standard Enterprise Master Services Agreement covering SLA commitments (99.95%), indemnification caps, and GDPR/CCPA data governance.',
    sampleSnippets: [
      {
        pageNumber: 3,
        highlightText: 'Service Level Agreement guarantees 99.95% monthly uptime excluding scheduled maintenance windows announced 72 hours in advance.',
        contextText: 'Section 4.1: Availability and SLA Credits. Service Level Agreement guarantees 99.95% monthly uptime excluding scheduled maintenance windows announced 72 hours in advance. Downtime exceeding 0.5% triggers a 10% credit.',
      },
      {
        pageNumber: 8,
        highlightText: 'Either party may terminate for convenience with sixty (60) days prior written notice without penalty.',
        contextText: 'Section 11.2: Termination for Convenience. Either party may terminate for convenience with sixty (60) days prior written notice without penalty, provided all accrued milestone fees are settled.',
      },
      {
        pageNumber: 14,
        highlightText: 'Total aggregate liability under this Agreement shall not exceed the total fees paid by Customer during the twelve (12) months preceding the claim.',
        contextText: 'Section 14.3: Limitation of Liability. Except for gross negligence or willful misconduct, Total aggregate liability under this Agreement shall not exceed the total fees paid by Customer during the twelve (12) months preceding the claim.',
      },
    ],
  },
  {
    id: 'doc_arch_spec',
    name: 'Distributed_Vector_Storage_Architecture.pdf',
    type: 'pdf',
    size: 7.4 * 1024 * 1024,
    pageCount: 65,
    uploadedAt: Date.now() - 86400000 * 2,
    status: 'ready',
    summary: 'Technical architecture specification outlining HNSW indexing, chunking heuristics, hybrid BM25 re-ranking, and sub-100ms P99 latency SLA.',
    sampleSnippets: [
      {
        pageNumber: 7,
        highlightText: 'Chunk size is normalized to 512 tokens with a 15% sliding window overlap to preserve semantic continuity across paragraph boundaries.',
        contextText: 'Data Ingestion Pipeline: Ingestion breaks unstructured documents into chunk hierarchies. Chunk size is normalized to 512 tokens with a 15% sliding window overlap to preserve semantic continuity across paragraph boundaries.',
      },
      {
        pageNumber: 22,
        highlightText: 'Hybrid search combines dense vector cosine similarity with sparse BM25 lexical matching via Reciprocal Rank Fusion (RRF k=60).',
        contextText: 'Query Processing Engine: Hybrid search combines dense vector cosine similarity with sparse BM25 lexical matching via Reciprocal Rank Fusion (RRF k=60), elevating precision by 19.4% on domain-specific acronym queries.',
      },
    ],
  },
  {
    id: 'doc_benefits_guide',
    name: 'Global_Employee_Benefits_Handbook_2026.txt',
    type: 'txt',
    size: 420 * 1024,
    pageCount: 14,
    uploadedAt: Date.now() - 86400000 * 4,
    status: 'ready',
    summary: 'Employee perks, health insurance coverage, $3,000 annual learning stipend, and 24 weeks paid parental leave policy.',
    sampleSnippets: [
      {
        pageNumber: 2,
        highlightText: 'All regular full-time team members receive a $3,000 annual continuous education stipend for certifications, books, and accredited coursework.',
        contextText: 'Professional Development: LensIQ values lifelong mastery. All regular full-time team members receive a $3,000 annual continuous education stipend for certifications, books, and accredited coursework.',
      },
    ],
  },
  {
    id: 'doc_roadmap_deck',
    name: 'Q1_Q2_Product_Strategy_Roadmap.pptx',
    type: 'pptx',
    size: 11.5 * 1024 * 1024,
    pageCount: 28,
    uploadedAt: Date.now() - 86400000 * 6,
    status: 'ready',
    summary: 'Executive pitch deck showcasing the Phase 1 web client rollout, spreadsheet extraction engine, and enterprise compliance roadmap.',
    sampleSnippets: [
      {
        pageNumber: 5,
        highlightText: 'Target Phase 1 launch milestone includes zero-latency citation jumping and structured multi-document spreadsheet extraction.',
        contextText: 'Key Product Milestones: Target Phase 1 launch milestone includes zero-latency citation jumping and structured multi-document spreadsheet extraction.',
      },
    ],
  },
  {
    id: 'doc_legal_brief_processing',
    name: 'Patent_Portfolio_Audit_Draft.pdf',
    type: 'pdf',
    size: 3.1 * 1024 * 1024,
    pageCount: 32,
    uploadedAt: Date.now() - 60000,
    status: 'processing',
    progress: 68,
    summary: 'Parsing optical character streams and generating semantic vector index...',
  },
  {
    id: 'doc_failed_scan',
    name: 'Scanned_Receipts_Archive_Corrupt.pdf',
    type: 'pdf',
    size: 14.8 * 1024 * 1024,
    pageCount: 110,
    uploadedAt: Date.now() - 3600000 * 8,
    status: 'failed',
    errorMessage: 'Corrupt raster header encountered at byte 0x4F9B. Unable to extract character layer.',
  },
];

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_fin_summary',
    title: 'Q3 Financial Health & Revenue Growth',
    createdAt: Date.now() - 3600000 * 2,
    updatedAt: Date.now() - 3600000 * 2,
    selectedDocIds: ['doc_fin_q3'],
    lastMessageSnippet: 'Gross revenue stood at $128.4M with a 24.2% YoY increase.',
    messageCount: 2,
  },
  {
    id: 'conv_sla_review',
    title: 'Enterprise MSA SLA & Liability Clauses',
    createdAt: Date.now() - 86400000 * 1,
    updatedAt: Date.now() - 86400000 * 1,
    selectedDocIds: ['doc_tos_saas'],
    lastMessageSnippet: 'Uptime guarantee is 99.95% with aggregate liability capped at 12 months fees.',
    messageCount: 2,
  },
  {
    id: 'conv_arch_deepdive',
    title: 'Vector Search Indexing & BM25 Fusion',
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
    selectedDocIds: ['doc_arch_spec'],
    lastMessageSnippet: 'RRF with k=60 delivers a 19.4% precision uplift over pure dense retrieval.',
    messageCount: 2,
  },
  {
    id: 'conv_benefits_check',
    title: 'Parental Leave & Education Stipend',
    createdAt: Date.now() - 86400000 * 8,
    updatedAt: Date.now() - 86400000 * 8,
    selectedDocIds: ['doc_benefits_guide'],
    lastMessageSnippet: 'Full-time employees receive a $3,000 annual professional development budget.',
    messageCount: 2,
  },
];

export const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {
  conv_fin_summary: [
    {
      id: 'msg_u1',
      conversationId: 'conv_fin_summary',
      role: 'user',
      content: 'What was the gross revenue for Q3 2025, and what were the main drivers of the reported growth?',
      createdAt: Date.now() - 3600000 * 2,
      preference: 'balanced',
      attachedDocIds: ['doc_fin_q3'],
    },
    {
      id: 'msg_a1',
      conversationId: 'conv_fin_summary',
      role: 'assistant',
      content: `Based on the provided **Q3 2025 Financial Performance Report**, here is the verified breakdown:

### 1. Revenue Overview
- **Gross Revenue**: **$128.4 Million** [[1]]
- **Growth Rate**: **+24.2% Year-over-Year (YoY)** [[1]]
- **Net Retention Rate (NRR)**: Stabilized at **118%** across core accounts [[1]]

### 2. Primary Growth Drivers
1. **Enterprise Tier Expansion**: Accelerated adoption of premium multi-seat enterprise licenses accounted for 64% of net-new ARR [[1]].
2. **Infrastructure Cost Reductions**: Operating expenditures declined by **4.8%** through cloud consolidation and automated routing [[2]].
3. **Robust Liquidity**: Unrestricted cash and cash equivalents totaled **$84.5 Million** with zero short-term debt obligations [[3]].

### Key Financial Snapshot
| Metric | Q3 2025 | YoY Change | Reference |
| :--- | :--- | :--- | :--- |
| **Gross Revenue** | $128.4M | +24.2% | Page 4 |
| **OpEx Reduction** | -4.8% | - | Page 12 |
| **Cash Reserves** | $84.5M | +12.1% | Page 19 |
| **Free Cash Flow (9M)** | $31.2M | +18.5% | Page 12 |

Everything cited above corresponds directly to the audited quarterly disclosures.`,
      createdAt: Date.now() - 3600000 * 2 + 1500,
      preference: 'balanced',
      feedback: 'like',
      citations: [
        {
          id: 'cit_1',
          docId: 'doc_fin_q3',
          docName: 'Q3_2025_Financial_Performance_Report.pdf',
          pageNumber: 4,
          highlightText: 'Gross revenue for Q3 2025 reached $128.4M, representing a 24.2% year-over-year expansion driven by enterprise tier subscriptions.',
        },
        {
          id: 'cit_2',
          docId: 'doc_fin_q3',
          docName: 'Q3_2025_Financial_Performance_Report.pdf',
          pageNumber: 12,
          highlightText: 'Operating expenditure decreased by 4.8% due to cloud infrastructure consolidation and automated support routing.',
        },
        {
          id: 'cit_3',
          docId: 'doc_fin_q3',
          docName: 'Q3_2025_Financial_Performance_Report.pdf',
          pageNumber: 19,
          highlightText: 'Cash and cash equivalents at the end of the quarter were $84.5 million, with zero short-term debt covenants.',
        },
      ],
      followUps: [
        'What are the capital expenditure projections for Q4?',
        'How did operating margins compare against Q2?',
        'Export this financial summary to a structured table',
      ],
    },
  ],
};

