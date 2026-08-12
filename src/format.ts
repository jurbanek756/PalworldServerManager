import type { AppError, AppErrorCode, Player, Settings } from "./types";

/**
 * Formats a duration in seconds into a human-readable uptime string (e.g. "2d 4h 15m").
 */
export const formatUptime = (seconds: number) => {
  const d = Math.floor(seconds / 86400); 
  const h = Math.floor((seconds % 86400) / 3600); 
  const m = Math.floor((seconds % 3600) / 60);
  return `${d ? `${d}d ` : ""}${h}h ${m}m`;
};

/**
 * Formats an ISO 8601 timestamp string into a localized medium date & time string.
 */
export const formatRefreshTime = (iso: string) => 
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(new Date(iso));

/**
 * Converts a raw Palworld setting key (e.g. `bIsPvP` or `ServerName`) into a clean human-readable title (e.g. "Is PvP" or "Server Name").
 */
export const formatSettingName = (key: string): string => {
  if (!key) return "";
  // Strip leading 'b' boolean prefix if followed by uppercase (e.g. bIsPvP -> IsPvP)
  const cleanKey = key.replace(/^b(?=[A-Z])/, "");

  const segments = cleanKey.split("_").map((seg) => {
    let spaced = seg
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");

    spaced = spaced
      .replace(/\bPv P\b/g, "PvP")
      .replace(/\bPvp\b/gi, "PvP")
      .replace(/\bRest Api\b/gi, "REST API")
      .replace(/\bRestapi\b/gi, "REST API")
      .replace(/\bRcon\b/gi, "RCON")
      .replace(/\bHp\b/gi, "HP")
      .replace(/\bIp\b/gi, "IP")
      .replace(/\bUrl\b/gi, "URL")
      .replace(/\bTtl\b/gi, "TTL")
      .replace(/\bFx\b/gi, "FX")
      .replace(/\bU Id\b/gi, "UID")
      .replace(/\bUId\b/gi, "UID")
      .replace(/\bUnko\b/gi, "UNKO");

    return spaced.trim();
  });

  return segments.join(": ");
};

/**
 * Formats unknown setting values (booleans, numbers, arrays, nulls) into clean UI strings.
 */
export const formatSettingValue = (value: unknown): string => {
  if (value === null || value === undefined) return "None";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "None";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return String(value);
    if (Number.isInteger(value)) return String(value);
    const str = value.toFixed(4);
    return String(parseFloat(str));
  }
  return String(value);
};

const fixed = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value.toFixed(0) : "-";

/**
 * Transforms raw player array objects with computed UI labels (`pingLabel` and `position`).
 */
export const playerRows = (players: Player[]) => 
  players.map((p) => ({ 
    ...p, 
    pingLabel: `${fixed(p.ping)} ms`, 
    position: `${fixed(p.location_x)}, ${fixed(p.location_y)}` 
  }));

export type SettingGroupCategory = "Server" | "Gameplay" | "World" | "Other";

/**
 * Groups raw server settings into categorized sections ("Server", "Gameplay", "World", "Other").
 */
export const groupSettings = (settings: Settings) => {
  const groups: Record<SettingGroupCategory, [string, string][]> = { Server: [], Gameplay: [], World: [], Other: [] };
  Object.entries(settings).sort(([a], [b]) => a.localeCompare(b)).forEach(([key, value]) => {
    const group: SettingGroupCategory = /Server|Public|RCON|REST|Region|BanList|Auth|Platform|Log/.test(key) 
      ? "Server" 
      : /Player|Pal|Guild|PvP|Damage|Death|FastTravel|Aim|Friendly/.test(key) 
      ? "Gameplay" 
      : /Day|Night|Base|Build|Collection|Drop|Egg|Invader|Backup/.test(key) 
      ? "World" 
      : "Other";
    groups[group].push([key, formatSettingValue(value)]);
  });
  return groups;
};

/**
 * Parses raw error response payloads into strongly typed `AppError` structures.
 */
export const errorFromUnknown = (value: unknown): AppError => {
  const text = typeof value === "string" ? value : "Unexpected error.";
  const code = (text.match(/\[(auth|unavailable|bad_request|malformed_response|timeout|unknown)\]/)?.[1] ?? "unknown") as AppErrorCode;
  return { code, message: text.replace(/^\[[^\]]+\]\s*/, "") };
};


