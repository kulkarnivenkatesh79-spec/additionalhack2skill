/**
 * AI Legal Assist — Shared TypeScript interfaces.
 *
 * These types mirror the backend Pydantic models to ensure
 * type-safe communication between frontend and API.
 *
 * @module types
 */

/* ── Response Types ──────────────────────────────────────────────────────── */

/** Response from the document summarisation endpoint. */
export interface SummaryResponse {
  /** Plain-language summary of the legal document. */
  summary: string;
  /** Bullet-point key takeaways. */
  key_points: string[];
  /** Character count of the uploaded document. */
  original_length: number;
}

/** A single difference found between two contracts. */
export interface ComparisonItem {
  /** Name or label of the clause. */
  clause: string;
  /** Text or summary from Document A. */
  document_a: string;
  /** Text or summary from Document B. */
  document_b: string;
  /** One of: added, removed, modified, identical. */
  difference_type: "added" | "removed" | "modified" | "identical";
}

/** Response from the contract comparison endpoint. */
export interface ComparisonResponse {
  /** High-level summary of differences. */
  overall_summary: string;
  /** Detailed per-clause comparison list. */
  items: ComparisonItem[];
}

/** A single flagged risk in a legal document. */
export interface RiskItem {
  /** The clause text or label. */
  clause: string;
  /** Risk severity level. */
  risk_level: "high" | "medium" | "low";
  /** Why this clause is risky. */
  explanation: string;
  /** Suggested action. */
  recommendation: string;
}

/** Response from the risk-highlighting endpoint. */
export interface RiskResponse {
  /** High-level risk assessment. */
  overall_assessment: string;
  /** List of flagged risks. */
  risks: RiskItem[];
}

/** Request body for the Q&A chat endpoint. */
export interface ChatRequest {
  /** The legal document text. */
  document_text: string;
  /** The user's question about the document. */
  question: string;
}

/** Response from the Q&A chat endpoint. */
export interface ChatResponse {
  /** The AI-generated answer. */
  answer: string;
  /** Confidence qualifier. */
  confidence: "high" | "moderate" | "low";
}

/** Generic API error response. */
export interface ApiError {
  /** Error detail message. */
  detail: string;
}

/* ── UI State Types ──────────────────────────────────────────────────────── */

/** Union type for the four dashboard tools. */
export type ToolTab = "simplifier" | "comparator" | "risks" | "chat";

/** Represents the current state of an async operation. */
export type LoadingState = "idle" | "loading" | "success" | "error";
