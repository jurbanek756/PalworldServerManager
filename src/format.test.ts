import { describe, expect, it } from "vitest";
import { errorFromUnknown, formatSettingName, formatSettingValue, formatUptime, groupSettings, playerRows } from "./format";

describe("formatting", () => {
  it("formats uptime", () => expect(formatUptime(93720)).toBe("1d 2h 2m"));
  it("prepares player display values", () => expect(playerRows([{ name: "A", accountName: "a", playerId: "p", userId: "u", ip: "127.0.0.1", ping: 3.6, location_x: 12.4, location_y: -8.9, level: 2, building_count: 5 }])[0]).toMatchObject({ pingLabel: "4 ms", position: "12, -9" }));
  it("groups settings", () => expect(groupSettings({ ServerName: "Test", ExpRate: 2 }).Server).toHaveLength(1));
  it("removes floating point display artifacts", () => expect(formatSettingValue(0.10000000149011612)).toBe("0.1"));
  it("formats boolean and array setting values", () => {
    expect(formatSettingValue(true)).toBe("True");
    expect(formatSettingValue(["Steam", "Xbox", "PS5"])).toBe("Steam, Xbox, PS5");
    expect(formatSettingValue([])).toBe("None");
  });
  it("formats setting names cleanly into human readable words", () => {
    expect(formatSettingName("AdditionalDropItemNumWhenPlayerKillingInPvPMode")).toBe("Additional Drop Item Num When Player Killing In PvP Mode");
    expect(formatSettingName("bAllowEnhanceStat_Attack")).toBe("Allow Enhance Stat: Attack");
    expect(formatSettingName("bIsPvP")).toBe("Is PvP");
    expect(formatSettingName("RESTAPIEnabled")).toBe("REST API Enabled");
    expect(formatSettingName("DropItemMaxNum_UNKO")).toBe("Drop Item Max Num: UNKO");
    expect(formatSettingName("PalAutoHpRegeneRateInSleep")).toBe("Pal Auto HP Regene Rate In Sleep");
    expect(formatSettingName("BuildingNameDisplayCacheTTLSeconds")).toBe("Building Name Display Cache TTL Seconds");
  });
  it("maps safe command errors", () => expect(errorFromUnknown("[auth] Credentials were rejected.").code).toBe("auth"));
});
