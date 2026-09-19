"use client";

import { useCallback, useRef, useState } from "react";

/** Accepted file types matching backend validation. */
const ACCEPTED_TYPES = ".pdf,.txt,.docx";

/** Maximum file size in bytes (2 MB). */
const MAX_FILE_SIZE = 2 * 1024 * 1024;

/** File extension to human-readable label map. */
const TYPE_LABELS: Record<string, string> = {
  ".pdf": "PDF",
  ".txt": "Text",
  ".docx": "Word",
};

/**
 * Props for the FileUpload component.
 */
interface FileUploadProps {
  /** Callback fired when a valid file is selected. */
  onFileSelect: (file: File) => void;
  /** Unique identifier for accessibility (ARIA). */
  id: string;
  /** Label text displayed above the drop zone. */
  label: string;
  /** Whether the upload zone is disabled. */
  disabled?: boolean;
}

/**
 * Accessible file upload component with drag-and-drop support.
 *
 * Features:
 * - Drag-and-drop + click-to-browse
 * - Client-side file type and size validation
 * - Full keyboard navigability (Tab + Enter/Space)
 * - ARIA labels for screen readers
 *
 * @param props - Component props.
 * @returns The file upload zone JSX element.
 */
export default function FileUpload({
  onFileSelect,
  id,
  label,
  disabled = false,
}: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Validate a file and fire the callback if valid.
   */
  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      setFileName(null);

      // Extension check
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      const validExts = ACCEPTED_TYPES.split(",");
      if (!validExts.includes(ext)) {
        setError(
          `Invalid file type "${ext}". Accepted: ${Object.values(TYPE_LABELS).join(", ")}.`
        );
        return;
      }

      // Size check
      if (file.size > MAX_FILE_SIZE) {
        setError(
          `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum: 2 MB.`
        );
        return;
      }

      setFileName(file.name);
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile, disabled]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <label
        htmlFor={id}
        style={{
          fontSize: "0.875rem",
          fontWeight: 600,
          color: "var(--color-text-secondary)",
        }}
      >
        {label}
      </label>

      <div
        className={`upload-zone ${dragOver ? "drag-over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`${label}. Drag and drop or press Enter to browse. Accepted: PDF, TXT, DOCX. Max 2 MB.`}
        aria-disabled={disabled}
        style={{ opacity: disabled ? 0.5 : 1 }}
      >
        <input
          ref={inputRef}
          type="file"
          id={id}
          accept={ACCEPTED_TYPES}
          onChange={handleChange}
          disabled={disabled}
          style={{ display: "none" }}
          aria-describedby={`${id}-status`}
          data-testid={`${id}-input`}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--color-text-muted)" }}
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>

          {fileName ? (
            <span
              style={{
                color: "var(--color-success)",
                fontWeight: 600,
                fontSize: "0.875rem",
              }}
            >
              ✓ {fileName}
            </span>
          ) : (
            <>
              <span
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: "0.875rem",
                }}
              >
                Drag &amp; drop or{" "}
                <span
                  style={{
                    color: "var(--color-accent)",
                    textDecoration: "underline",
                  }}
                >
                  browse
                </span>
              </span>
              <span
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "0.75rem",
                }}
              >
                PDF, TXT, or DOCX · Max 2 MB
              </span>
            </>
          )}
        </div>
      </div>

      {/* Status / error feedback */}
      <div
        id={`${id}-status`}
        role="status"
        aria-live="polite"
        style={{ minHeight: "1.25rem" }}
      >
        {error && (
          <span
            style={{
              color: "var(--color-error)",
              fontSize: "0.8125rem",
            }}
          >
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
