/**
 * Disclaimer component.
 *
 * Displays a prominent, always-visible legal disclaimer banner.
 * Uses `role="alert"` so screen readers announce it immediately,
 * and high-contrast amber colouring for visual prominence.
 *
 * @returns The disclaimer banner JSX element.
 */
export default function Disclaimer() {
  return (
    <div
      className="disclaimer-banner"
      role="alert"
      aria-label="Legal disclaimer"
      id="legal-disclaimer"
    >
      <span aria-hidden="true" style={{ fontSize: "1.25rem", flexShrink: 0 }}>
        ⚠️
      </span>
      <p style={{ margin: 0 }}>
        <strong>Disclaimer:</strong> This tool provides AI-generated legal
        information and assistance. It does{" "}
        <strong>not</strong> constitute, nor should it replace, professional
        legal advice. Always consult a qualified attorney for legal matters.
      </p>
    </div>
  );
}
