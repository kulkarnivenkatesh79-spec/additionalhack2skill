"use client";

import { useCallback, useState } from "react";
import FileUpload from "./FileUpload";
import { summarizeDocument } from "@/lib/api";
import type { LoadingState, SummaryResponse } from "@/types";

/**
 * Document Simplifier tool.
 *
 * Allows users to upload a legal document and receive a plain-language
 * summary with key points. Displays loading state via `aria-live`
 * region for screen reader announcements.
 *
 * @returns The Document Simplifier panel JSX element.
 */
export default function DocumentSimplifier() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<SummaryResponse | null>(null);
  const [status, setStatus] = useState<LoadingState>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!file) return;

    setStatus("loading");
    setError(null);
    setResult(null);

    try {
      const data = await summarizeDocument(file);
      setResult(data);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
      setStatus("error");
    }
  }, [file]);

  return (
    <article
      role="tabpanel"
      id="panel-simplifier"
      aria-labelledby="tab-simplifier"
      className="animate-fade-in"
      style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
    >
      <div>
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            margin: "0 0 0.5rem 0",
          }}
        >
          📄 Document Simplifier
        </h2>
        <p
          style={{
            color: "var(--color-text-secondary)",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          Upload a complex legal document and receive a plain-language summary
          that anyone can understand.
        </p>
      </div>

      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <FileUpload
          id="simplifier-upload"
          label="Upload legal document"
          onFileSelect={setFile}
          disabled={status === "loading"}
        />

        <div style={{ marginTop: "1rem" }}>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!file || status === "loading"}
            aria-busy={status === "loading"}
          >
            {status === "loading" ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Analysing…
              </>
            ) : (
              "Simplify Document"
            )}
          </button>
        </div>
      </div>

      {/* Live region for dynamic updates */}
      <div aria-live="polite" aria-atomic="true">
        {status === "loading" && (
          <div
            className="glass-card animate-pulse-glow"
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "var(--color-text-secondary)",
            }}
          >
            <div className="spinner" style={{ margin: "0 auto 1rem" }} />
            <p style={{ margin: 0 }}>
              AI is analysing your document… This may take a moment.
            </p>
          </div>
        )}

        {status === "error" && error && (
          <div
            className="glass-card"
            style={{
              padding: "1.25rem",
              borderColor: "var(--color-error)",
              color: "var(--color-error)",
            }}
            role="alert"
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {status === "success" && result && (
          <div
            className="glass-card animate-fade-in"
            style={{ padding: "1.5rem" }}
          >
            <h3
              style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                margin: "0 0 0.5rem 0",
                color: "var(--color-accent-hover)",
              }}
            >
              Summary
            </h3>
            <p
              style={{
                lineHeight: 1.7,
                color: "var(--color-text-secondary)",
                margin: "0 0 1.5rem 0",
                whiteSpace: "pre-wrap",
              }}
            >
              {result.summary}
            </p>

            {result.key_points.length > 0 && (
              <>
                <h3
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    margin: "0 0 0.75rem 0",
                    color: "var(--color-accent-hover)",
                  }}
                >
                  Key Points
                </h3>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "0 0 1.5rem 0",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  {result.key_points.map((point, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.5rem",
                        color: "var(--color-text-secondary)",
                        lineHeight: 1.6,
                      }}
                    >
                      <span
                        style={{
                          color: "var(--color-success)",
                          flexShrink: 0,
                          marginTop: "0.125rem",
                        }}
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {result.actionable_checklist && result.actionable_checklist.length > 0 && (
              <div style={{ marginBottom: "1.5rem" }}>
                <h3
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    margin: "0 0 0.75rem 0",
                    color: "#38bdf8",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span>📋</span> Actionable Checklist
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {result.actionable_checklist.map((item, idx) => (
                    <label
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.75rem",
                        padding: "0.625rem 0.875rem",
                        borderRadius: "0.5rem",
                        background: "rgba(15, 23, 42, 0.5)",
                        border: "1px solid var(--color-border)",
                        fontSize: "0.875rem",
                        color: "var(--color-text-secondary)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        style={{ marginTop: "0.2rem", accentColor: "var(--color-accent)" }}
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {result.next_steps && result.next_steps.length > 0 && (
              <div style={{ marginBottom: "1.5rem" }}>
                <h3
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    margin: "0 0 0.75rem 0",
                    color: "#a78bfa",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span>🚀</span> Potential Next Steps
                </h3>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  {result.next_steps.map((step, idx) => (
                    <li
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.5rem",
                        color: "var(--color-text-secondary)",
                        fontSize: "0.875rem",
                        lineHeight: 1.6,
                      }}
                    >
                      <span style={{ color: "#a78bfa", flexShrink: 0 }}>→</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div
              style={{
                marginTop: "1rem",
                paddingTop: "1rem",
                borderTop: "1px solid var(--color-border)",
                fontSize: "0.8125rem",
                color: "var(--color-text-muted)",
              }}
            >
              Original document: {result.original_length.toLocaleString()}{" "}
              characters
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
