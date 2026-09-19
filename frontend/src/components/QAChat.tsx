"use client";

import { useCallback, useRef, useState } from "react";
import { chatAboutDocument, chatAboutDocumentStream } from "@/lib/api";
import type { LoadingState, ChatResponse } from "@/types";

/**
 * Message representation inside the local Q&A chat session.
 */
interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  confidence?: ChatResponse["confidence"];
  timestamp: string;
}

/** Helper to ensure clean, natural conversational text without accidental JSON artifacts. */
function cleanResponseText(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```json") || text.startsWith("```")) {
    text = text.replace(/^```json|^```|```$/g, "").trim();
  }
  if (text.startsWith("{") && text.endsWith("}")) {
    try {
      const parsed = JSON.parse(text);
      if (parsed.answer) {
        let res = parsed.answer;
        if (parsed.actionable_note) {
          res += `\n\n💡 Practical Tip: ${parsed.actionable_note}`;
        }
        return res;
      }
    } catch {
      // Not JSON, return as is
    }
  }
  return text;
}
interface QAChatProps {
  isAcknowledged?: boolean;
}

export default function QAChat({ isAcknowledged = true }: QAChatProps) {
  const [documentText, setDocumentText] = useState<string>("");
  const [inputQuestion, setInputQuestion] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<LoadingState>("idle");
  const [error, setError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!inputQuestion.trim() || !isAcknowledged) return;

      if (!documentText.trim()) {
        setError("Please paste the legal document text first to query against.");
        return;
      }

      setError(null);
      const userText = inputQuestion.trim();
      setInputQuestion("");

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: "user",
        text: userText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, userMsg]);
      const botMsgId = `bot-${Date.now()}`;
      const placeholderBotMsg: ChatMessage = {
        id: botMsgId,
        sender: "assistant",
        text: "",
        confidence: "high",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, placeholderBotMsg]);
      setStatus("loading");
      setTimeout(scrollToBottom, 50);

      try {
        let accumulated = "";
        await chatAboutDocumentStream(
          {
            document_text: documentText,
            question: userText,
          },
          (chunk: string) => {
            accumulated += chunk;
            const cleaned = cleanResponseText(accumulated);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMsgId ? { ...msg, text: cleaned } : msg
              )
            );
            scrollToBottom();
          }
        );

        if (!accumulated) {
          // Fallback to standard request if stream produced no chunks
          const response = await chatAboutDocument({
            document_text: documentText,
            question: userText,
          });
          const cleanAns = cleanResponseText(response.answer);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMsgId
                ? { ...msg, text: cleanAns, confidence: response.confidence }
                : msg
            )
          );
        } else {
          // Final clean on complete message
          const finalClean = cleanResponseText(accumulated);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMsgId ? { ...msg, text: finalClean } : msg
            )
          );
        }
        setStatus("success");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to obtain answer.");
        setStatus("error");
      } finally {
        setTimeout(scrollToBottom, 50);
      }
    },
    [inputQuestion, documentText, isAcknowledged]
  );

  return (
    <article
      role="tabpanel"
      id="panel-chat"
      aria-labelledby="tab-chat"
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
          💬 Legal Q&amp;A Chatbot
        </h2>
        <p
          style={{
            color: "var(--color-text-secondary)",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          Query any document directly. Get immediate, grounded answers in plain English.
        </p>
      </div>

      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <label
            htmlFor="doc-context"
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "var(--color-text-secondary)",
            }}
          >
            Active Document Text / Context
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => {
                setDocumentText(
                  "STANDARD CONSULTING AGREEMENT\n1. Services: Consultant will provide software engineering services.\n2. Compensation: $75 per hour, invoiced bi-weekly, net 15 days.\n3. Term & Termination: Either party may terminate with 14 days written notice.\n4. Intellectual Property: All work product created under this Agreement shall belong solely to Client.\n5. Indemnification: Consultant agrees to defend and hold harmless Client against any claims arising from Consultant's gross negligence."
                );
                setInputQuestion("What is the termination notice period and who owns the work product?");
              }}
              style={{
                fontSize: "0.75rem",
                padding: "0.25rem 0.5rem",
                borderRadius: "0.375rem",
                background: "rgba(139, 92, 246, 0.15)",
                color: "var(--color-accent-hover)",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                cursor: "pointer",
              }}
            >
              📋 Load Sample Contract
            </button>
            <button
              type="button"
              onClick={() => {
                setDocumentText(
                  "NON-DISCLOSURE AGREEMENT (NDA)\n1. Confidential Information: Technical, financial, and business data.\n2. Non-Disclosure Period: 2 years from disclosure date.\n3. Exclusions: Publicly known info or information independently developed.\n4. Return of Materials: Promptly within 10 days of request.\n5. Governing Law: State of California."
                );
                setInputQuestion("How long do the confidentiality obligations last?");
              }}
              style={{
                fontSize: "0.75rem",
                padding: "0.25rem 0.5rem",
                borderRadius: "0.375rem",
                background: "rgba(56, 189, 248, 0.15)",
                color: "#38bdf8",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                cursor: "pointer",
              }}
            >
              🔒 Load Sample NDA
            </button>
          </div>
        </div>
        <textarea
          id="doc-context"
          rows={5}
          value={documentText}
          onChange={(e) => setDocumentText(e.target.value)}
          placeholder="Paste agreements, clauses, or terms of service here to chat with them..."
          style={{
            width: "100%",
            padding: "0.75rem",
            background: "rgba(10, 14, 26, 0.6)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text-primary)",
            fontSize: "0.875rem",
            lineHeight: 1.5,
            resize: "vertical",
          }}
        />
      </div>

      {/* Chat conversation area */}
      <div
        className="glass-card"
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "360px",
          maxHeight: "520px",
          padding: "1.25rem",
          overflow: "hidden",
        }}
      >
        <div
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            paddingRight: "0.5rem",
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "var(--color-text-muted)",
                textAlign: "center",
                padding: "2rem",
              }}
            >
              <span style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>💬</span>
              <p style={{ margin: 0, fontSize: "0.875rem" }}>
                Ask questions like <em>&ldquo;Can the vendor terminate without notice?&rdquo;</em> or{" "}
                <em>&ldquo;What are my indemnification liabilities?&rdquo;</em>
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-message ${msg.sender}`}
                style={{ alignSelf: msg.sender === "user" ? "flex-end" : "flex-start" }}
              >
                <div style={{ fontSize: "0.75rem", opacity: 0.8, marginBottom: "0.25rem" }}>
                  {msg.sender === "user" ? "You" : "Legal AI Assistant"} · {msg.timestamp}
                </div>
                <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
                {msg.confidence && (
                  <div
                    style={{
                      fontSize: "0.7rem",
                      marginTop: "0.5rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      opacity: 0.85,
                      color:
                        msg.confidence === "high"
                          ? "var(--color-success)"
                          : msg.confidence === "moderate"
                          ? "var(--color-warning)"
                          : "var(--color-error)",
                    }}
                  >
                    Confidence: {msg.confidence}
                  </div>
                )}
              </div>
            ))
          )}

          {status === "loading" && (
            <div
              className="chat-message assistant animate-pulse-glow"
              style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span className="spinner" aria-hidden="true" />
              <span>Analyzing contract and forming response…</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {error && (
          <div
            role="alert"
            style={{
              marginTop: "0.75rem",
              padding: "0.5rem 0.75rem",
              borderRadius: "var(--radius-sm)",
              background: "var(--color-risk-high-bg)",
              color: "var(--color-risk-high)",
              fontSize: "0.8125rem",
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSendMessage}
          style={{
            display: "flex",
            gap: "0.75rem",
            marginTop: "1rem",
            paddingTop: "1rem",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          <input
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            placeholder="Type your question about the legal document..."
            disabled={status === "loading"}
            aria-label="Question about document"
            style={{
              flex: 1,
              padding: "0.75rem 1rem",
              background: "rgba(10, 14, 26, 0.6)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              color: "var(--color-text-primary)",
              fontSize: "0.875rem",
            }}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={status === "loading" || !inputQuestion.trim() || !isAcknowledged}
          >
            Send
          </button>
        </form>

        {!isAcknowledged && (
          <div style={{ marginTop: "0.75rem", fontSize: "0.8125rem", color: "#f59e0b" }}>
            ⚠️ Please check <strong>&ldquo;Acknowledged&rdquo;</strong> on the disclaimer banner above to chat.
          </div>
        )}
      </div>
    </article>
  );
}
