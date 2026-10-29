import { describe, expect, it } from "vitest";
import { isOfficialAuthor } from "./official-author";

describe("isOfficialAuthor", () => {
  it("accepts any @nutringest.com address", () => {
    expect(isOfficialAuthor({ email: "alguien@nutringest.com" })).toBe(true);
    expect(isOfficialAuthor({ email: "ALGUIEN@NUTRINGEST.COM" })).toBe(true);
  });

  it("accepts the explicit team addresses", () => {
    expect(isOfficialAuthor({ email: "nutringest@gmail.com" })).toBe(true);
    expect(isOfficialAuthor({ email: "equipo@nutringest.com" })).toBe(true);
  });

  it("accepts admins even without a company email", () => {
    expect(isOfficialAuthor({ email: "jose@gmail.com", permits: { name: "ADMIN" } })).toBe(
      true,
    );
    expect(
      isOfficialAuthor({ email: "jose@gmail.com", permits: { name: "SUPERADMIN" } }),
    ).toBe(true);
  });

  it("rejects regular users without a company email", () => {
    expect(isOfficialAuthor({ email: "nutri@gmail.com", permits: { name: "USER" } })).toBe(
      false,
    );
    expect(isOfficialAuthor({})).toBe(false);
    expect(isOfficialAuthor(null)).toBe(false);
    expect(isOfficialAuthor(undefined)).toBe(false);
  });
});
