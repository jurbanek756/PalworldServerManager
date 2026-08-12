import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { ConnectionConfig, Snapshot } from "../types";

/**
 * Registry mapping Tauri backend IPC command names to their exact argument & return payloads.
 */
export interface TauriCommandRegistry {
  get_saved_connection: {
    args: void;
    return: ConnectionConfig | null;
  };
  connect: {
    args: { request: { endpoint: string; username: string; password: string } };
    return: Snapshot;
  };
  refresh_monitor: {
    args: void;
    return: Snapshot;
  };
  forget_connection: {
    args: void;
    return: void;
  };
  start_monitoring: {
    args?: { intervalSecs?: number };
    return: void;
  };
  stop_monitoring: {
    args: void;
    return: void;
  };
  announce_message: {
    args: { message: string };
    return: void;
  };
  save_world: {
    args: void;
    return: void;
  };
  shutdown_server: {
    args: { waitTime: number; message: string };
    return: void;
  };
  stop_server: {
    args: void;
    return: void;
  };
  kick_player: {
    args: { userId: string; message: string };
    return: void;
  };
  ban_player: {
    args: { userId: string; message: string };
    return: void;
  };
  unban_player: {
    args: { userId: string };
    return: void;
  };
  fetch_ban_list: {
    args: void;
    return: unknown;
  };
}

export type TauriCommandName = keyof TauriCommandRegistry;

/**
 * Type-safe wrapper around Tauri's `invoke` API.
 * Infers argument and return types automatically from `TauriCommandRegistry`.
 */
export function invokeApi<K extends TauriCommandName>(
  cmd: K,
  ...args: TauriCommandRegistry[K]["args"] extends void ? [] : [args: TauriCommandRegistry[K]["args"]]
): Promise<TauriCommandRegistry[K]["return"]> {
  const payload = args[0] as Record<string, unknown> | undefined;
  return invoke<TauriCommandRegistry[K]["return"]>(cmd, payload);
}

/**
 * Subscribes to periodic background telemetry snapshot updates emitted by the Tauri host.
 * @param callback Handler receiving the updated `Snapshot` payload every polling cycle.
 * @returns Promise resolving to an unlisten function to unsubscribe.
 */
export function onTelemetryUpdate(callback: (snapshot: Snapshot) => void): Promise<UnlistenFn> {
  return listen<Snapshot>("telemetry-update", (event) => callback(event.payload));
}

/**
 * Subscribes to telemetry error events emitted when the background poller fails.
 * @param callback Handler receiving the formatted error message string.
 * @returns Promise resolving to an unlisten function to unsubscribe.
 */
export function onTelemetryError(callback: (errorMsg: string) => void): Promise<UnlistenFn> {
  return listen<string>("telemetry-error", (event) => callback(event.payload));
}

