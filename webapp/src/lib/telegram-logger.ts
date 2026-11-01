import { useAuthStore } from "@/shared/store/auth/useAuthStore";

interface ReportErrorParams {
  error: Error | string;
  errorInfo?: Record<string, unknown>;
  source?: string;
}

export async function sendTelegramErrorAlert({
  error,
  errorInfo,
  source = "Client Unhandled Error",
}: ReportErrorParams) {
  if (typeof window === "undefined") return;

  try {
    const errorMessage = typeof error === "string" ? error : error?.message || "Unknown error";
    const errorStack = typeof error !== "string" && error?.stack ? error.stack : "";

    // Ignore known noise / false positives
    if (
      errorMessage.includes("NEXT_REDIRECT") ||
      errorMessage.includes("Test directo Vercel") ||
      errorMessage.includes("Java object is gone") ||
      errorMessage.includes("M_ID") ||
      errorMessage.includes("removeChild") ||
      (errorMessage.includes("insertBefore") && errorStack.includes("chrome-extension://")) ||
      errorStack.includes("chrome-extension://") ||
      errorStack.includes("moz-extension://")
    ) {
      return;
    }

    const pageUrl = window.location.href;
    const userAgent = navigator.userAgent;
    const referrer = typeof document !== "undefined" && document.referrer ? document.referrer : undefined;
    const timestamp = new Date().toISOString();
    const environment = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || "production";

    // Safely retrieve active session without leaking PHI / sensitive clinical patient data
    let userId: string | undefined;
    let role: string | undefined;

    try {
      const user = useAuthStore.getState?.()?.user;
      if (user) {
        userId = user.id ? String(user.id) : undefined;
        role = user.permits?.name || user.permitId || undefined;
      }
    } catch {
      // Graceful fallback if Zustand store is not yet mounted or accessible
    }

    // React error boundaries (ComponentStackBoundary) attach the component
    // stack to the error instance before it bubbles to the reporting path.
    const componentStack =
      (typeof error !== "string" &&
      "componentStack" in error &&
      typeof (error as { componentStack?: unknown }).componentStack === "string"
        ? (error as { componentStack: string }).componentStack
        : undefined) ||
      (errorInfo && typeof errorInfo.componentStack === "string"
        ? errorInfo.componentStack
        : undefined);

    // Safe hash key calculation using URI encoding for Unicode/Emojis support
    const safeMsgSnippet = encodeURIComponent(errorMessage.slice(0, 50));
    const errorKey = `tg_err_${safeMsgSnippet}`;
    const lastSent = sessionStorage.getItem(errorKey);
    const now = Date.now();

    if (lastSent && now - parseInt(lastSent, 10) < 30000) {
      return; // Debounce
    }
    sessionStorage.setItem(errorKey, now.toString());

    const payload = {
      errorMessage,
      errorStack,
      errorDigest: typeof error !== "string" && "digest" in error && typeof error.digest === "string" ? error.digest : undefined,
      componentStack,
      pageUrl,
      userAgent,
      source,
      userId,
      role,
      referrer,
      timestamp,
      environment,
    };

    const url = "/api/report-error";

    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      navigator.sendBeacon(url, blob);
    } else {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
  } catch (err) {
    console.error("Failed to report error:", err);
  }
}
