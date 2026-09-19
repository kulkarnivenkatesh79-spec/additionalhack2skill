"use client";

import { useCallback } from "react";
import type { ToolTab } from "@/types";

/** Configuration for each tab in the navigation. */
interface TabConfig {
  /** The unique key matching ToolTab. */
  key: ToolTab;
  /** Display label. */
  label: string;
  /** Emoji icon. */
  icon: string;
}

/** Tab definitions for the dashboard navigation. */
const TABS: TabConfig[] = [
  { key: "simplifier", label: "Document Simplifier", icon: "📄" },
  { key: "comparator", label: "Contract Comparator", icon: "⚖️" },
  { key: "risks", label: "Risk Highlighter", icon: "🚨" },
  { key: "chat", label: "Q&A Chat", icon: "💬" },
];

/**
 * Props for the TabNavigation component.
 */
interface TabNavigationProps {
  /** Currently active tab. */
  activeTab: ToolTab;
  /** Callback when a tab is selected. */
  onTabChange: (tab: ToolTab) => void;
}

/**
 * Accessible tab navigation for the dashboard tools.
 *
 * Implements the WAI-ARIA Tabs pattern with:
 * - `role="tablist"` on the container
 * - `role="tab"` with `aria-selected` on each button
 * - Arrow key navigation between tabs
 * - Home/End key support for first/last tab
 *
 * @param props - Component props.
 * @returns The tab navigation JSX element.
 */
export default function TabNavigation({
  activeTab,
  onTabChange,
}: TabNavigationProps) {
  /**
   * Handle keyboard navigation between tabs.
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
      let nextIndex: number | null = null;

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          nextIndex = (currentIndex + 1) % TABS.length;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
          break;
        case "Home":
          e.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          e.preventDefault();
          nextIndex = TABS.length - 1;
          break;
      }

      if (nextIndex !== null) {
        onTabChange(TABS[nextIndex].key);
        // Focus the newly selected tab
        const tabElement = document.getElementById(
          `tab-${TABS[nextIndex].key}`
        );
        tabElement?.focus();
      }
    },
    [onTabChange]
  );

  return (
    <nav aria-label="Dashboard tools">
      <div
        role="tablist"
        aria-label="Legal analysis tools"
        style={{
          display: "flex",
          gap: "0.25rem",
          borderBottom: "1px solid var(--color-border)",
          overflowX: "auto",
          paddingBottom: "0",
        }}
      >
        {TABS.map((tab, index) => (
          <button
            key={tab.key}
            id={`tab-${tab.key}`}
            role="tab"
            aria-selected={activeTab === tab.key}
            aria-controls={`panel-${tab.key}`}
            tabIndex={activeTab === tab.key ? 0 : -1}
            className="tab-button"
            onClick={() => onTabChange(tab.key)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            <span aria-hidden="true" style={{ marginRight: "0.375rem" }}>
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
