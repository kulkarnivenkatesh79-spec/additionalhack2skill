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
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://additionalhack2skill.onrender.com";

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

/**
 * Stream an answer about a legal document chunk-by-chunk using Server-Sent Events.
 *
 * @param request - The chat request with document text and question.
 * @param onChunk - Callback invoked with each received text chunk.
 */
export async function chatAboutDocumentStream(
  request: ChatRequest,
  onChunk: (chunk: string) => void
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      detail: `Stream request failed with status ${response.status}`,
    }));
    throw new Error(errorBody.detail ?? "Streaming error occurred.");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("ReadableStream not supported by browser environment.");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") return;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.chunk) {
            onChunk(parsed.chunk);
          }
        } catch {
          // ignore non-json line
        }
      }
    }
  }
}
