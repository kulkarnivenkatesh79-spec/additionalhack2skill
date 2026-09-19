"use client";

import React, { useState } from "react";

/**
 * Enterprise Persistent Disclaimer Component.
 *
 * Sticky across all tools, accessible (WCAG 2.1 AA compliant, role="alert"),
 * and prominent with clear separation from legal advice.
 */
export default function Disclaimer() {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <aside
      className="disclaimer-banner sticky top-2 z-30 shadow-lg border border-amber-500/30 backdrop-blur-md transition-all duration-300"
      role="alert"
      aria-label="Legal disclaimer"
      id="legal-disclaimer"
      style={{
        background: "rgba(245, 158, 11, 0.12)",
        borderColor: "rgba(245, 158, 11, 0.35)",
        borderRadius: "0.75rem",
        padding: "0.875rem 1.25rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: "280px" }}>
        <span aria-hidden="true" style={{ fontSize: "1.35rem", flexShrink: 0 }}>
          ⚠️
        </span>
        <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: "1.5", color: "#fef3c7" }}>
          <strong style={{ color: "#f59e0b" }}>Disclaimer:</strong> This tool provides AI-generated legal
          information and assistance. It does <strong>not</strong> constitute, nor should it replace,
          professional legal advice. Always consult a qualified attorney for legal matters.
        </p>
      </div>

      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.75rem",
          color: "#cbd5e1",
          cursor: "pointer",
          userSelect: "none",
          background: "rgba(15, 23, 42, 0.6)",
          padding: "0.25rem 0.625rem",
          borderRadius: "0.375rem",
          border: "1px solid rgba(245, 158, 11, 0.2)",
        }}
      >
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          aria-label="I understand this is AI legal assistance and not legal advice"
          style={{ accentColor: "#f59e0b", cursor: "pointer" }}
        />
        <span>Acknowledged</span>
      </label>
    </aside>
  );
}
