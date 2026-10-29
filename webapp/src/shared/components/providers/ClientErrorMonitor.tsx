"use client";

import { useEffect } from "react";
import { sendTelegramErrorAlert } from "@/lib/telegram-logger";

export function ClientErrorMonitor({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      sendTelegramErrorAlert({
        error: reason instanceof Error ? reason : String(reason),
        source: "Unhandled Promise Rejection (async)",
      });
    };

    const handleWindowError = (event: ErrorEvent) => {
      sendTelegramErrorAlert({
        error: event.error || event.message || "Global Window Error",
        source: "Global Window Error",
      });
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleWindowError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleWindowError);
    };
  }, []);

  return <>{children}</>;
}
