import { NextResponse } from "next/server";
import { buildTelegramHtmlMessage } from "@/lib/telegram-formatter";

const DEDUP_WINDOW_MS = 60_000;
const recentAlerts = new Map<string, number>();

function isDuplicateAlert(key: string): boolean {
  const now = Date.now();
  for (const [k, ts] of recentAlerts) {
    if (now - ts >= DEDUP_WINDOW_MS) recentAlerts.delete(k);
  }
  const last = recentAlerts.get(key);
  if (last !== undefined && now - last < DEDUP_WINDOW_MS) return true;
  recentAlerts.set(key, now);
  return false;
}

export async function POST(req: Request) {
  try {
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID || process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;

    if (!telegramBotToken || !telegramChatId) {
      console.warn("Telegram env variables not configured in server");
      return NextResponse.json({ success: false, reason: "Missing telegram credentials" }, { status: 400 });
    }

    const body = await req.json();
    const {
      errorMessage,
      errorStack,
      errorDigest,
      componentStack,
      pageUrl,
      userAgent,
      device = userAgent,
      source,
      userId,
      role,
      referrer,
      timestamp,
      environment,
    } = body;

    if (isDuplicateAlert(`${errorMessage ?? "Unknown error"}|${pageUrl ?? ""}`)) {
      return NextResponse.json({ success: true, deduplicated: true });
    }

    const text = buildTelegramHtmlMessage({
      errorMessage,
      errorStack,
      errorDigest,
      componentStack,
      pageUrl,
      userAgent,
      device,
      source,
      userId,
      role,
      referrer,
      timestamp,
      environment,
    });

    const payload = {
      chat_id: telegramChatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };

    const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!data.ok) {
      console.error("Telegram API error response:", data);
      return NextResponse.json({ success: false, error: data.description }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error sending Telegram alert via API route:", err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
