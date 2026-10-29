import { sanitizeStackSnippet } from "./error-stack";

/**
 * Escapes characters with special meaning in Telegram HTML mode.
 * In Telegram Bot API, the supported formatting tags are <b>, <i>, <u>, <s>, <a>, <code>, <pre>, <blockquote>.
 * All literal &, <, and > symbols MUST be escaped as &amp;, &lt;, and &gt;.
 */
export function escapeHtml(text?: unknown): string {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Escapes an attribute value (such as href in <a>) in Telegram HTML mode.
 */
export function escapeAttribute(text?: unknown): string {
  if (text === null || text === undefined) return "";
  return escapeHtml(text).replace(/"/g, "&quot;");
}

export function formatUrl(url?: string): string {
  if (!url) return "<i>No disponible</i>";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return `<a href="${escapeAttribute(encodeURI(url))}">${escapeHtml(url)}</a>`;
  }
  return `<code>${escapeHtml(url)}</code>`;
}

export function formatReferrer(referrer?: string): string {
  if (!referrer) return "<i>Directo / Ninguno</i>";
  if (referrer.startsWith("http://") || referrer.startsWith("https://")) {
    return `<a href="${escapeAttribute(encodeURI(referrer))}">${escapeHtml(referrer)}</a>`;
  }
  return `<code>${escapeHtml(referrer)}</code>`;
}

export interface TelegramAlertData {
  errorMessage?: string;
  errorStack?: string;
  errorDigest?: string;
  componentStack?: string;
  pageUrl?: string;
  userAgent?: string;
  device?: string;
  source?: string;
  userId?: string;
  role?: string;
  referrer?: string;
  timestamp?: string;
  environment?: string;
  commitSha?: string;
}

export function buildTelegramHtmlMessage(data: TelegramAlertData): string {
  const env = String(
    data.environment ||
      process.env.NEXT_PUBLIC_VERCEL_ENV ||
      process.env.NODE_ENV ||
      "production"
  ).toUpperCase();

  const commitSha =
    data.commitSha ??
    process.env.NEXT_PUBLIC_COMMIT_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA;
  const commitSnippet = commitSha ? commitSha.slice(0, 7) : "N/A";

  const timestampStr = data.timestamp || new Date().toISOString();
  const deviceInfo = String(data.device || data.userAgent || "Unknown").slice(0, 120);

  // First 5 meaningful frames; blank lines dropped and repeated minified frames collapsed
  const formattedStack = sanitizeStackSnippet(data.errorStack);
  const formattedComponentStack = sanitizeStackSnippet(data.componentStack);

  const safeStack = formattedStack.slice(0, 600);
  const safeComponentStack = formattedComponentStack.slice(0, 600);

  const digestLine = data.errorDigest
    ? `\n🧬 <b>Digest:</b> <code>${escapeHtml(data.errorDigest)}</code>`
    : "";

  const userDisplay = data.userId
    ? `<code>${escapeHtml(data.userId)}</code>${data.role ? ` (Rol: <code>${escapeHtml(data.role)}</code>)` : ""}`
    : "<i>Anónimo / No autenticado</i>";

  const componentStackSection =
    data.componentStack && formattedComponentStack !== "No stacktrace available"
      ? `\n\n🧩 <b>Component Stack:</b>\n<pre>${escapeHtml(safeComponentStack)}</pre>`
      : "";

  const stackSection =
    data.errorStack && formattedStack !== "No stacktrace available"
      ? `\n\n📜 <b>Stack Snippet:</b>\n<pre>${escapeHtml(safeStack)}</pre>`
      : "";

  return (
    `🚨 <b>NUTRINGEST ${escapeHtml(env)} CRASH</b> 🚨\n\n` +
    `📌 <b>Fuente:</b> <code>${escapeHtml(data.source || "Client Crash")}</code>\n` +
    `🌐 <b>URL:</b> ${formatUrl(data.pageUrl)}\n` +
    `🧭 <b>Referrer:</b> ${formatReferrer(data.referrer)}\n` +
    `👤 <b>Usuario ID:</b> ${userDisplay}\n` +
    `⏱️ <b>Timestamp (UTC):</b> <code>${escapeHtml(timestampStr)}</code>\n` +
    `🔖 <b>Commit:</b> <code>${escapeHtml(commitSnippet)}</code>\n` +
    `📱 <b>Dispositivo:</b> <code>${escapeHtml(deviceInfo)}</code>\n\n` +
    `❌ <b>Error:</b> <code>${escapeHtml(String(data.errorMessage || "Unknown error").slice(0, 400))}</code>` +
    `${digestLine}` +
    `${componentStackSection}` +
    `${stackSection}`
  );
}
