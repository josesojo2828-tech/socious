import { describe, expect, it } from "vitest";
import {
  buildTelegramHtmlMessage,
  escapeAttribute,
  escapeHtml,
  formatReferrer,
  formatUrl,
} from "./telegram-formatter";

describe("telegram-formatter", () => {
  describe("escapeHtml", () => {
    it("escapes &, <, > properly", () => {
      expect(escapeHtml("a & b < c > d")).toBe("a &amp; b &lt; c &gt; d");
    });

    it("leaves markdown characters like _, *, ` untouched to avoid Markdown bugs", () => {
      expect(escapeHtml("foo_bar *baz* `qux`")).toBe("foo_bar *baz* `qux`");
    });

    it("handles null, undefined and empty values safely", () => {
      expect(escapeHtml(null)).toBe("");
      expect(escapeHtml(undefined)).toBe("");
      expect(escapeHtml("")).toBe("");
    });
  });

  describe("escapeAttribute", () => {
    it("escapes quotes as &quot; for HTML attributes", () => {
      expect(escapeAttribute('url"with"quotes&amp')).toBe("url&quot;with&quot;quotes&amp;amp");
    });
  });

  describe("formatUrl and formatReferrer", () => {
    it("formats valid HTTP/HTTPS URLs as anchor tags", () => {
      const url = "https://nutringest.com/dashboard/patient?id=10&tab=stats";
      const formatted = formatUrl(url);
      expect(formatted).toBe(
        '<a href="https://nutringest.com/dashboard/patient?id=10&amp;tab=stats">https://nutringest.com/dashboard/patient?id=10&amp;tab=stats</a>'
      );
    });

    it("falls back to code tags for non-http URLs", () => {
      expect(formatUrl("blob:nutringest-temp")).toBe("<code>blob:nutringest-temp</code>");
    });

    it("returns placeholder when URL is missing", () => {
      expect(formatUrl(undefined)).toBe("<i>No disponible</i>");
    });

    it("returns Directo / Ninguno when referrer is missing", () => {
      expect(formatReferrer(undefined)).toBe("<i>Directo / Ninguno</i>");
      expect(formatReferrer("")).toBe("<i>Directo / Ninguno</i>");
    });

    it("formats referrer link when present", () => {
      expect(formatReferrer("https://google.com/search")).toBe(
        '<a href="https://google.com/search">https://google.com/search</a>'
      );
    });
  });

  describe("buildTelegramHtmlMessage", () => {
    it("builds a complete HTML alert message with user, environment, and stacks", () => {
      const message = buildTelegramHtmlMessage({
        errorMessage: "Cannot read property 'name' of undefined",
        errorStack: "Error: boom\n    at Component.render (https://nutringest.com/app.js:1:1)",
        componentStack: "    at PatientCard (src/PatientCard.tsx:10:5)",
        errorDigest: "1234567890",
        pageUrl: "https://nutringest.com/dashboard/patients",
        referrer: "https://nutringest.com/dashboard",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        source: "React Error Boundary",
        userId: "usr_999",
        role: "NUTRI_PRO",
        timestamp: "2026-10-18T10:00:00.000Z",
        environment: "production",
        commitSha: "abcdef123456",
      });

      expect(message).toContain("🚨 <b>NUTRINGEST PRODUCTION CRASH</b> 🚨");
      expect(message).toContain("📌 <b>Fuente:</b> <code>React Error Boundary</code>");
      expect(message).toContain('🌐 <b>URL:</b> <a href="https://nutringest.com/dashboard/patients">https://nutringest.com/dashboard/patients</a>');
      expect(message).toContain('🧭 <b>Referrer:</b> <a href="https://nutringest.com/dashboard">https://nutringest.com/dashboard</a>');
      expect(message).toContain("👤 <b>Usuario ID:</b> <code>usr_999</code> (Rol: <code>NUTRI_PRO</code>)");
      expect(message).toContain("⏱️ <b>Timestamp (UTC):</b> <code>2026-10-18T10:00:00.000Z</code>");
      expect(message).toContain("🔖 <b>Commit:</b> <code>abcdef1</code>");
      expect(message).toContain("📱 <b>Dispositivo:</b> <code>Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)</code>");
      expect(message).toContain("❌ <b>Error:</b> <code>Cannot read property 'name' of undefined</code>");
      expect(message).toContain("🧬 <b>Digest:</b> <code>1234567890</code>");
      expect(message).toContain("🧩 <b>Component Stack:</b>\n<pre>    at PatientCard (src/PatientCard.tsx:10:5)</pre>");
      expect(message).toContain("📜 <b>Stack Snippet:</b>\n<pre>Error: boom\n    at Component.render (https://nutringest.com/app.js:1:1)</pre>");
    });

    it("renders unauthenticated user gracefully when userId is missing", () => {
      const message = buildTelegramHtmlMessage({
        errorMessage: "Public page crash",
        environment: "staging",
      });

      expect(message).toContain("🚨 <b>NUTRINGEST STAGING CRASH</b> 🚨");
      expect(message).toContain("👤 <b>Usuario ID:</b> <i>Anónimo / No autenticado</i>");
      expect(message).toContain("🧭 <b>Referrer:</b> <i>Directo / Ninguno</i>");
      expect(message).toContain("🌐 <b>URL:</b> <i>No disponible</i>");
      // Component stack and stack snippet should be omitted if not present
      expect(message).not.toContain("Component Stack:");
      expect(message).not.toContain("Stack Snippet:");
    });

    it("safely escapes HTML in stacks and error messages (preventing parser 400s)", () => {
      const message = buildTelegramHtmlMessage({
        errorMessage: "Error: <script>alert(1)</script> & failure",
        errorStack: "Error\n    at <anonymous> (bundle.js:1:1)\n    at eval (eval at <anonymous>)",
      });

      expect(message).toContain("Error: &lt;script&gt;alert(1)&lt;/script&gt; &amp; failure");
      expect(message).toContain("&lt;anonymous&gt;");
      expect(message).not.toContain("<anonymous>");
    });
  });
});
