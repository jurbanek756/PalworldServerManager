import { describe, expect, it } from "vitest";
import { Ok, Err, isOk, isErr, unwrapOr, mapResult, isPalworldPlayer, isSnapshot } from "./types";

describe("Type System & Result Utilities", () => {
  it("constructs and identifies Ok results correctly", () => {
    const res = Ok(42);
    expect(isOk(res)).toBe(true);
    expect(isErr(res)).toBe(false);
    if (isOk(res)) {
      expect(res.value).toBe(42);
    }
  });

  it("constructs and identifies Err results correctly", () => {
    const res = Err({ code: "auth", message: "Failed" });
    expect(isOk(res)).toBe(false);
    expect(isErr(res)).toBe(true);
    if (isErr(res)) {
      expect(res.error.code).toBe("auth");
    }
  });

  it("unwraps values with unwrapOr fallback", () => {
    expect(unwrapOr(Ok("success"), "fallback")).toBe("success");
    expect(unwrapOr(Err({ code: "unknown", message: "err" }), "fallback")).toBe("fallback");
  });

  it("maps Ok results with mapResult", () => {
    const doubled = mapResult(Ok(10), (x) => x * 2);
    expect(unwrapOr(doubled, 0)).toBe(20);
  });

  it("validates PalworldPlayer type guard", () => {
    const valid = { name: "Player1", playerId: "p123", level: 50 };
    const invalid = { name: 123 };
    expect(isPalworldPlayer(valid)).toBe(true);
    expect(isPalworldPlayer(invalid)).toBe(false);
  });

  it("validates Snapshot type guard", () => {
    const validSnapshot = {
      refreshedAt: "12:00:00 PM",
      info: { version: "1.0", servername: "PalWorld", description: "Test", worldguid: "abc-123" },
      metrics: { serverfps: 60, currentplayernum: 5, maxplayernum: 32, uptime: 100, days: 1, serverframetime: 16.6, basecampnum: 2 },
      players: [],
      settings: {}
    };
    expect(isSnapshot(validSnapshot)).toBe(true);
    expect(isSnapshot(null)).toBe(false);
  });
});
