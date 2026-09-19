/**
 * AI Legal Assist — API client.
 *
 * Typed functions for communicating with the FastAPI backend.
 * All calls are async and include error handling.
 *
 * @module api
 */

import type {
  ChatRequest,
  ChatResponse,
  ComparisonResponse,
  RiskResponse,
  SummaryResponse,
} from "@/types";

/** Base URL for the API, read from environment variable. */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8008";

/**
 * Generic fetch wrapper with error handling.
 *
 * @template T - The expected response type.
 * @param url - The full URL to fetch.
 * @param options - Standard fetch options.
 * @returns Parsed JSON response of type T.
 * @throws Error with the API detail message on failure.
 */
async function apiFetch<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      detail: `Request failed with status ${response.status}`,
    }));
    throw new Error(errorBody.detail ?? "An unknown error occurred.");
  }

  return response.json() as Promise<T>;
}

/**
 * Upload a legal document for plain-language summarisation.
 *
 * @param file - The document file to summarise.
 * @returns The AI-generated summary and key points.
 */
export async function summarizeDocument(
  file: File
): Promise<SummaryResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<SummaryResponse>(`${API_BASE}/api/summarize`, {
    method: "POST",
    body: formData,
  });
}

/**
 * Upload two contracts for side-by-side comparison.
 *
 * @param fileA - The first contract document.
 * @param fileB - The second contract document.
 * @returns The comparison summary and per-clause items.
 */
export async function compareContracts(
  fileA: File,
  fileB: File
): Promise<ComparisonResponse> {
  const formData = new FormData();
  formData.append("file_a", fileA);
  formData.append("file_b", fileB);

  return apiFetch<ComparisonResponse>(`${API_BASE}/api/compare`, {
    method: "POST",
    body: formData,
  });
}

/**
 * Upload a legal document to highlight risks and obligations.
 *
 * @param file - The document file to analyse.
 * @returns The risk assessment and itemised risks.
 */
export async function highlightRisks(file: File): Promise<RiskResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<RiskResponse>(`${API_BASE}/api/risks`, {
    method: "POST",
    body: formData,
  });
}

/**
 * Ask a question about a legal document.
 *
 * @param request - The chat request with document text and question.
 * @returns The AI-generated answer and confidence level.
 */
export async function chatAboutDocument(
  request: ChatRequest
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}
