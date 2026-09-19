"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Disclaimer from "@/components/Disclaimer";
import TabNavigation from "@/components/TabNavigation";
import type { ToolTab } from "@/types";

// Dynamic/lazy loading for tool components to keep initial bundle and DOM lightweight
const DocumentSimplifier = dynamic(
  () => import("@/components/DocumentSimplifier"),
  {
    loading: () => (
      <div
        className="glass-card animate-pulse-glow"
        style={{ padding: "2rem", textAlign: "center" }}
      >
        <span className="spinner" aria-hidden="true" style={{ margin: "0 auto" }} />
        <p style={{ marginTop: "0.5rem", color: "var(--color-text-secondary)" }}>
          Loading Document Simplifier…
        </p>
      </div>
    ),
  }
);

const ContractComparator = dynamic(
  () => import("@/components/ContractComparator"),
  {
    loading: () => (
      <div
        className="glass-card animate-pulse-glow"
        style={{ padding: "2rem", textAlign: "center" }}
      >
        <span className="spinner" aria-hidden="true" style={{ margin: "0 auto" }} />
        <p style={{ marginTop: "0.5rem", color: "var(--color-text-secondary)" }}>
          Loading Contract Comparator…
        </p>
      </div>
    ),
  }
);

const RiskHighlighter = dynamic(
  () => import("@/components/RiskHighlighter"),
  {
    loading: () => (
      <div
        className="glass-card animate-pulse-glow"
        style={{ padding: "2rem", textAlign: "center" }}
      >
        <span className="spinner" aria-hidden="true" style={{ margin: "0 auto" }} />
        <p style={{ marginTop: "0.5rem", color: "var(--color-text-secondary)" }}>
          Loading Risk Highlighter…
        </p>
      </div>
    ),
  }
);

const QAChat = dynamic(
  () => import("@/components/QAChat"),
  {
    loading: () => (
      <div
        className="glass-card animate-pulse-glow"
        style={{ padding: "2rem", textAlign: "center" }}
      >
        <span className="spinner" aria-hidden="true" style={{ margin: "0 auto" }} />
        <p style={{ marginTop: "0.5rem", color: "var(--color-text-secondary)" }}>
          Loading Q&amp;A Chat…
        </p>
      </div>
    ),
  }
);

/**
 * Main Legal Assistance Dashboard.
 *
 * Provides a unified, accessible portal housing 4 GenAI legal tools:
 * 1. Document Simplifier
 * 2. Contract Comparator
 * 3. Risk Highlighter
 * 4. Q&A Chat
 *
 * Adheres strictly to WCAG 2.1 AA standards, keyboard navigation,
 * and high-contrast visuals.
 *
 * @returns Dashboard page JSX.
 */
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<ToolTab>("simplifier");
  const [acknowledged, setAcknowledged] = useState<boolean>(false);

  return (
    <div
      style={{
        maxWidth: "80rem",
        margin: "0 auto",
        padding: "2rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
      }}
    >
      {/* 1. Prominent Mandatory Disclaimer Component */}
      <section aria-label="Important Legal Notice">
        <Disclaimer
          acknowledged={acknowledged}
          onAcknowledgeChange={setAcknowledged}
        />
      </section>

      {/* Hero Intro Header */}
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              padding: "0.2rem 0.6rem",
              borderRadius: "9999px",
              background: "rgba(139, 92, 246, 0.15)",
              color: "var(--color-accent-hover)",
              border: "1px solid rgba(139, 92, 246, 0.3)",
            }}
          >
            Gemini 2.5 Flash Powered
          </span>
        </div>
        <h2
          style={{
            fontSize: "2.25rem",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Intelligent Legal Assistance &amp; Accessibility
        </h2>
        <p
          style={{
            fontSize: "1.0625rem",
            color: "var(--color-text-secondary)",
            margin: 0,
            maxWidth: "50rem",
            lineHeight: 1.6,
          }}
        >
          Transform dense contracts into readable plain language, cross-examine two agreements,
          isolate risky clauses, and clarify legal language in real-time.
        </p>
      </section>

      {/* Navigation Tabs */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Active Tab Panel with Lazy Loading */}
      <section style={{ minHeight: "450px" }}>
        {activeTab === "simplifier" && (
          <DocumentSimplifier isAcknowledged={acknowledged} />
        )}
        {activeTab === "comparator" && (
          <ContractComparator isAcknowledged={acknowledged} />
        )}
        {activeTab === "risks" && (
          <RiskHighlighter isAcknowledged={acknowledged} />
        )}
        {activeTab === "chat" && <QAChat isAcknowledged={acknowledged} />}
      </section>
    </div>
  );
}
