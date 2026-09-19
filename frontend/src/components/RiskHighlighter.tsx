"use client";

import { useCallback, useMemo, useState } from "react";
import FileUpload from "./FileUpload";
import { highlightRisks } from "@/lib/api";
import type { LoadingState, RiskResponse, RiskItem } from "@/types";

/**
 * Risk Highlighter Tool.
 *
 * Scans uploaded legal contracts to flag high, medium, and low risks,
 * hidden obligations, critical clauses, and ambiguities.
 * Optimized with useMemo and useCallback for maximum rendering efficiency.
 */
export default function RiskHighlighter() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<RiskResponse | null>(null);
  const [status, setStatus] = useState<LoadingState>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!file) return;

    setStatus("loading");
    setError(null);
    setResult(null);

    try {
      const data = await highlightRisks(file);
      setResult(data);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during risk analysis.");
      setStatus("error");
    }
  }, [file]);

  const getRiskBadgeClass = useCallback((level: RiskItem["risk_level"]): string => {
    switch (level.toLowerCase()) {
      case "high":
        return "risk-badge high";
      case "medium":
        return "risk-badge medium";
      case "low":
      default:
        return "risk-badge low";
    }
  }, []);

  const risks = result?.risks;
  const riskStats = useMemo(() => {
    if (!risks) return { high: 0, medium: 0, low: 0 };
    return {
      high: risks.filter((r) => r.risk_level.toLowerCase() === "high").length,
      medium: risks.filter((r) => r.risk_level.toLowerCase() === "medium").length,
      low: risks.filter((r) => r.risk_level.toLowerCase() === "low").length,
    };
  }, [risks]);

  return (
    <article
      role="tabpanel"
      id="panel-risks"
      aria-labelledby="tab-risks"
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
          🚨 Risk &amp; Clause Highlighter
        </h2>
        <p
          style={{
            color: "var(--color-text-secondary)",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          Detect critical liabilities, hidden commitments, unilateral termination clauses,
          and ambiguous terminology automatically.
        </p>
      </div>

      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <FileUpload
          id="risk-upload"
          label="Upload contract for risk audit"
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
                Auditing Clauses…
              </>
            ) : (
              "Scan for Risks"
            )}
          </button>
        </div>
      </div>

      {/* Live region for accessibility updates */}
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
              AI is scanning for hidden legal risks and liabilities… Please wait.
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
            <strong>Risk Audit Error:</strong> {error}
          </div>
        )}

        {status === "success" && result && (
          <div
            className="glass-card animate-fade-in"
            style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <h3
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    margin: 0,
                    color: "var(--color-accent-hover)",
                  }}
                >
                  Overall Risk Assessment
                </h3>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {riskStats.high > 0 && <span className="risk-badge high">{riskStats.high} High</span>}
                  {riskStats.medium > 0 && <span className="risk-badge medium">{riskStats.medium} Medium</span>}
                  {riskStats.low > 0 && <span className="risk-badge low">{riskStats.low} Low</span>}
                </div>
              </div>
              <p
                style={{
                  lineHeight: 1.7,
                  color: "var(--color-text-secondary)",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                }}
              >
                {result.overall_assessment}
              </p>
            </div>

            {result.actionable_next_steps && result.actionable_next_steps.length > 0 && (
              <div style={{ padding: "1.25rem", borderRadius: "var(--radius-md)", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)" }}>
                <h3
                  style={{
                    fontSize: "1.0625rem",
                    fontWeight: 700,
                    margin: "0 0 0.75rem 0",
                    color: "#f87171",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span>🚨</span> Priority Remediation Steps
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
                  {result.actionable_next_steps.map((step, idx) => (
                    <li
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.5rem",
                        color: "var(--color-text-primary)",
                        fontSize: "0.875rem",
                        lineHeight: 1.6,
                      }}
                    >
                      <span style={{ color: "#f87171", flexShrink: 0 }}>⚠️</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.risks.length > 0 ? (
              <div>
                <h3
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    margin: "0 0 1rem 0",
                    color: "var(--color-accent-hover)",
                  }}
                >
                  Identified Clauses &amp; Liabilities ({result.risks.length})
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {result.risks.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        background: "var(--color-bg-glass)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-md)",
                        padding: "1.25rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "0.5rem",
                        }}
                      >
                        <strong style={{ fontSize: "1rem", color: "var(--color-text-primary)" }}>
                          {item.clause}
                        </strong>
                        <span className={getRiskBadgeClass(item.risk_level)}>
                          {item.risk_level} Risk
                        </span>
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            color: "var(--color-text-muted)",
                            marginBottom: "0.25rem",
                            fontWeight: 600,
                          }}
                        >
                          Potential Danger / Impact
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.875rem",
                            color: "var(--color-text-secondary)",
                            lineHeight: 1.6,
                          }}
                        >
                          {item.explanation}
                        </p>
                      </div>

                      <div
                        style={{
                          padding: "0.75rem",
                          borderRadius: "var(--radius-sm)",
                          background: "rgba(139, 92, 246, 0.08)",
                          borderLeft: "3px solid var(--color-accent)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.75rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            color: "var(--color-accent-hover)",
                            fontWeight: 700,
                            marginBottom: "0.25rem",
                          }}
                        >
                          Recommended Action / Revision
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.875rem",
                            color: "var(--color-text-primary)",
                            lineHeight: 1.5,
                          }}
                        >
                          {item.recommendation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ color: "var(--color-success)", margin: 0 }}>
                No significant high-risk clauses or critical liabilities were flagged.
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
