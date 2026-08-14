import { invokeApi, onTelemetryUpdate, onTelemetryError } from "./types/ipc";
import type { ConnectionConfig, Snapshot, ConnectionError } from "./types";

export { onTelemetryUpdate, onTelemetryError };

export const getSavedConnection = () => invokeApi("get_saved_connection");

export const connect = (endpoint: string, username: string, password: string) =>
  invokeApi("connect", { request: { endpoint, username, password } });

export const refresh = () => invokeApi("refresh_monitor");

export const forgetConnection = () => invokeApi("forget_connection");

export const startMonitoring = (intervalSecs?: number) =>
  invokeApi("start_monitoring", intervalSecs !== undefined ? { intervalSecs } : undefined);

export const stopMonitoring = () => invokeApi("stop_monitoring");

export const announceMessage = (message: string) =>
  invokeApi("announce_message", { message });

export const saveWorld = () => invokeApi("save_world");

export const shutdownServer = (waitTime: number, message: string) =>
  invokeApi("shutdown_server", { waitTime, message });

export const stopServer = () => invokeApi("stop_server");

export const kickPlayer = (userId: string, message: string) =>
  invokeApi("kick_player", { userId, message });

export const banPlayer = (userId: string, message: string) =>
  invokeApi("ban_player", { userId, message });

export const unbanPlayer = (userId: string) =>
  invokeApi("unban_player", { userId });

export const fetchBanList = () => invokeApi("fetch_ban_list");

export const getSqliteInfo = () => invokeApi("get_sqlite_info");

export const fetchHabitantHistory = () => invokeApi("fetch_habitant_history");

export const fetchPlayerSessions = (playerId: string) =>
  invokeApi("fetch_player_sessions", { playerId });

export function parseError(errStr: string): ConnectionError {
  const timestamp = new Date().toLocaleTimeString();

  if (errStr.includes("[auth]") || errStr.toLowerCase().includes("credentials")) {
    return {
      code: "AUTH_FAILED",
      title: "Authentication Failed (HTTP 401)",
      message: "The server rejected the username or password specified in your connection settings.",
      detail: errStr,
      troubleshooting: [
        "Verify AdminPassword in your PalWorldSettings.ini file.",
        "Check that username matches 'admin' (default for Palworld REST API).",
        "Ensure no extra spaces were accidentally pasted in the password field."
      ],
      timestamp
    };
  }

  if (errStr.includes("[timeout]")) {
    return {
      code: "TIMEOUT",
      title: "Connection Timeout",
      message: "The Palworld REST API endpoint did not respond within the 10-second limit.",
      detail: errStr,
      troubleshooting: [
        "Verify your Palworld server process is currently running.",
        "Check that RESTAPIEnabled=True is set in PalWorldSettings.ini.",
        "Ensure Windows Firewall is allowing inbound TCP traffic on port 8212/8281."
      ],
      timestamp
    };
  }

  if (errStr.includes("[malformed_response]")) {
    return {
      code: "MALFORMED_RESPONSE",
      title: "Malformed Response Payload",
      message: "The server returned data that could not be parsed as valid Palworld JSON.",
      detail: errStr,
      troubleshooting: [
        "Ensure you are calling the REST API port (default: 8212), not the game client UDP port (8211).",
        "Check whether a web server (like Nginx or IIS) is occupying the specified HTTP port."
      ],
      timestamp
    };
  }

  return {
    code: "SERVER_UNAVAILABLE",
    title: "Palworld Server Unavailable",
    message: errStr.replace(/^\[.*?\]\s*/, "") || "Could not reach Palworld REST API endpoint.",
    detail: errStr,
    troubleshooting: [
      "Ensure RESTAPIEnabled=True is enabled in PalWorldSettings.ini.",
      "Check that your server URL includes http:// or https:// and port number.",
      "Verify host IP address and LAN subnet accessibility."
    ],
    timestamp
  };
}

export function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);

  return parts.join(" ");
}

export function formatFpsQuality(fps: number): { text: string; colorClass: string } {
  if (fps >= 55) return { text: "Optimal (60 FPS)", colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
  if (fps >= 30) return { text: "Stable", colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
  return { text: "Degraded Performance", colorClass: "text-rose-400 bg-rose-500/10 border-rose-500/30" };
}

export function formatPing(ping: number): string {
  if (typeof ping !== "number" || !Number.isFinite(ping)) return "0 ms";
  const val = Number.isInteger(ping) ? String(ping) : String(parseFloat(ping.toFixed(2)));
  return `${val} ms`;
}
