"use client";

import { useCallback, useMemo, useState } from "react";
import FileUpload from "./FileUpload";
import { compareContracts } from "@/lib/api";
import type { ComparisonResponse, LoadingState } from "@/types";

/**
 * Contract Comparator tool.
 *
 * Allows users to upload two contracts and receive a side-by-side
 * analysis of differences, similarities, and modifications.
 * Highly optimized with useMemo and useCallback.
 */
interface ContractComparatorProps {
  isAcknowledged?: boolean;
}

export default function ContractComparator({ isAcknowledged = true }: ContractComparatorProps) {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [result, setResult] = useState<ComparisonResponse | null>(null);
  const [status, setStatus] = useState<LoadingState>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!fileA || !fileB || !isAcknowledged) return;

    setStatus("loading");
    setError(null);
    setResult(null);

    try {
      const data = await compareContracts(fileA, fileB);
      setResult(data);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
      setStatus("error");
    }
  }, [fileA, fileB, isAcknowledged]);

  /** Memoized badge class resolver. */
  const getDiffBadgeClass = useCallback((type: string): string => {
    const classes: Record<string, string> = {
      added: "diff-badge added",
      removed: "diff-badge removed",
      modified: "diff-badge modified",
      identical: "diff-badge identical",
    };
    return classes[type] || "diff-badge identical";
  }, []);

  /** Memoized clause items list. */
  const memoizedItems = useMemo(() => {
    return result?.items || [];
  }, [result?.items]);

  return (
    <article
      role="tabpanel"
      id="panel-comparator"
      aria-labelledby="tab-comparator"
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
          ⚖️ Contract Comparator
        </h2>
        <p
          style={{
            color: "var(--color-text-secondary)",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          Upload two legal agreements to generate a detailed side-by-side
          comparison of differences and similarities.
        </p>
      </div>

      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.5rem",
          }}
        >
          <FileUpload
            id="compare-upload-a"
            label="Document A"
            onFileSelect={setFileA}
            disabled={status === "loading"}
          />
          <FileUpload
            id="compare-upload-b"
            label="Document B"
            onFileSelect={setFileB}
            disabled={status === "loading"}
          />
        </div>

        <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!fileA || !fileB || status === "loading" || !isAcknowledged}
            aria-busy={status === "loading"}
          >
            {status === "loading" ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Comparing…
              </>
            ) : (
              "Compare Contracts"
            )}
          </button>

          {!isAcknowledged && (
            <span style={{ fontSize: "0.8125rem", color: "#f59e0b" }}>
              ⚠️ Please check <strong>&ldquo;Acknowledged&rdquo;</strong> on the disclaimer banner above to proceed.
            </span>
          )}
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
              AI is comparing your documents… This may take a moment.
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
                margin: "0 0 0.75rem 0",
                color: "var(--color-accent-hover)",
              }}
            >
              Overall Summary
            </h3>
            <p
              style={{
                lineHeight: 1.7,
                color: "var(--color-text-secondary)",
                margin: "0 0 1.5rem 0",
                whiteSpace: "pre-wrap",
              }}
            >
              {result.overall_summary}
            </p>

            {result.actionable_takeaways && result.actionable_takeaways.length > 0 && (
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
                  <span>⚖️</span> Actionable Takeaways & Decision Points
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
                  {result.actionable_takeaways.map((takeaway, idx) => (
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
                      <span style={{ color: "#38bdf8", flexShrink: 0 }}>💡</span>
                      {takeaway}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {memoizedItems.length > 0 && (
              <>
                <h3
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    margin: "0 0 0.75rem 0",
                    color: "var(--color-accent-hover)",
                  }}
                >
                  Clause-by-Clause Comparison
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  {memoizedItems.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        background: "var(--color-bg-glass)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-md)",
                        padding: "1rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "0.75rem",
                        }}
                      >
                        <strong style={{ fontSize: "0.9375rem" }}>
                          {item.clause}
                        </strong>
                        <span className={getDiffBadgeClass(item.difference_type)}>
                          {item.difference_type}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "1rem",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: "var(--color-text-muted)",
                              marginBottom: "0.25rem",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            Document A
                          </div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.875rem",
                              color: "var(--color-text-secondary)",
                              lineHeight: 1.6,
                            }}
                          >
                            {item.document_a || "—"}
                          </p>
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: "var(--color-text-muted)",
                              marginBottom: "0.25rem",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            Document B
                          </div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.875rem",
                              color: "var(--color-text-secondary)",
                              lineHeight: 1.6,
                            }}
                          >
                            {item.document_b || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
