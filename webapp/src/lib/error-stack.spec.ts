import { describe, expect, it } from "vitest";
import { sanitizeStackSnippet } from "./error-stack";

describe("sanitizeStackSnippet", () => {
  it("returns the placeholder when the stack is missing", () => {
    expect(sanitizeStackSnippet(undefined)).toBe("No stacktrace available");
    expect(sanitizeStackSnippet(null)).toBe("No stacktrace available");
    expect(sanitizeStackSnippet("")).toBe("No stacktrace available");
    expect(sanitizeStackSnippet("   \n  \n")).toBe("No stacktrace available");
  });

  it("keeps the first 5 lines of a normal stack", () => {
    const stack = [
      "Error: Failed to execute 'insertBefore' on 'Node'",
      "    at foo (https://nutringest.com/_next/static/chunks/main-abc.js:1:1)",
      "    at bar (https://nutringest.com/_next/static/chunks/main-abc.js:2:2)",
      "    at baz (https://nutringest.com/_next/static/chunks/pages-x.js:3:3)",
      "    at qux (https://nutringest.com/_next/static/chunks/pages-x.js:4:4)",
      "    at corge (https://nutringest.com/_next/static/chunks/pages-x.js:5:5)",
      "    at grault (https://nutringest.com/_next/static/chunks/pages-x.js:6:6)",
    ].join("\n");

    expect(sanitizeStackSnippet(stack)).toBe(
      [
        "Error: Failed to execute 'insertBefore' on 'Node'",
        "    at foo (https://nutringest.com/_next/static/chunks/main-abc.js:1:1)",
        "    at bar (https://nutringest.com/_next/static/chunks/main-abc.js:2:2)",
        "    at baz (https://nutringest.com/_next/static/chunks/pages-x.js:3:3)",
        "    at qux (https://nutringest.com/_next/static/chunks/pages-x.js:4:4)",
      ].join("\n")
    );
  });

  it("collapses repeated minified frames so unique frames survive the budget", () => {
    const noise = "    at iR (https://nutringest.com/_next/static/chunks/865.js:1:9)";
    const stack = [
      "NotFoundError: Failed to execute 'insertBefore' on 'Node'",
      noise,
      noise,
      noise,
      noise,
      noise,
      noise,
      "    at commitPlacement (https://nutringest.com/_next/static/chunks/index.js:1:1)",
      "    at ComponentStackBoundary.componentDidCatch",
    ].join("\n");

    expect(sanitizeStackSnippet(stack)).toBe(
      [
        "NotFoundError: Failed to execute 'insertBefore' on 'Node'",
        noise,
        "    at commitPlacement (https://nutringest.com/_next/static/chunks/index.js:1:1)",
        "    at ComponentStackBoundary.componentDidCatch",
      ].join("\n")
    );
  });

  it("trims surrounding whitespace per line and drops blank lines", () => {
    const stack = "Error: boom\n\n    at foo (a.js:1:1)\n\n    at bar (b.js:2:2)\n";

    expect(sanitizeStackSnippet(stack)).toBe(
      "Error: boom\n    at foo (a.js:1:1)\n    at bar (b.js:2:2)"
    );
  });

  it("respects a custom maxLines", () => {
    const stack = "Error: boom\n    at a\n    at b\n    at c";

    expect(sanitizeStackSnippet(stack, 2)).toBe("Error: boom\n    at a");
  });
});
