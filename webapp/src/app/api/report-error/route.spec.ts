import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("POST /api/report-error", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.TELEGRAM_BOT_TOKEN = "mock-bot-token";
    process.env.TELEGRAM_CHAT_ID = "mock-chat-id";
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("returns 400 if Telegram environment variables are missing", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;

    const req = new Request("http://localhost/api/report-error", {
      method: "POST",
      body: JSON.stringify({ errorMessage: "Crash" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.reason).toBe("Missing telegram credentials");
  });

  it("successfully forwards crash report to Telegram with HTML parse_mode", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, result: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const req = new Request("http://localhost/api/report-error", {
      method: "POST",
      body: JSON.stringify({
        errorMessage: "Test crash & error <script>",
        errorStack: "Error: Test crash\n    at testFn (test.ts:1:1)",
        pageUrl: "https://nutringest.com/dashboard/patient?id=123&action=edit",
        source: "Client Error Monitor",
        userId: "usr_42",
        role: "ADMIN",
        referrer: "https://nutringest.com/dashboard",
        timestamp: "2026-10-18T12:00:00.000Z",
        environment: "staging",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [calledUrl, calledInit] = fetchSpy.mock.calls[0];
    expect(calledUrl).toBe("https://api.telegram.org/botmock-bot-token/sendMessage");

    const sentBody = JSON.parse(calledInit?.body as string);
    expect(sentBody.chat_id).toBe("mock-chat-id");
    expect(sentBody.parse_mode).toBe("HTML");
    expect(sentBody.disable_web_page_preview).toBe(true);
    expect(sentBody.text).toContain("🚨 <b>NUTRINGEST STAGING CRASH</b> 🚨");
    expect(sentBody.text).toContain("👤 <b>Usuario ID:</b> <code>usr_42</code> (Rol: <code>ADMIN</code>)");
    expect(sentBody.text).toContain("Test crash &amp; error &lt;script&gt;");
  });

  it("deduplicates identical errors occurring within the deduplication window", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const makeReq = () =>
      new Request("http://localhost/api/report-error", {
        method: "POST",
        body: JSON.stringify({
          errorMessage: "Unique duplicated crash message",
          pageUrl: "https://nutringest.com/dashboard/unique-page",
        }),
      });

    const firstRes = await POST(makeReq());
    const firstData = await firstRes.json();
    expect(firstData.success).toBe(true);
    expect(firstData.deduplicated).toBeUndefined();

    const secondRes = await POST(makeReq());
    const secondData = await secondRes.json();
    expect(secondData.success).toBe(true);
    expect(secondData.deduplicated).toBe(true);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
