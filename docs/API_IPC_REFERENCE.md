# API & IPC Reference Documentation

This document provides a comprehensive technical reference for all **Tauri IPC Commands**, **TypeScript Helper APIs**, **Tauri Event Subscriptions**, and **Palworld REST API mappings** used by the Palworld Server Monitor desktop application.

---

## 1. Tauri IPC Command Registry

All IPC interactions between the React frontend and Rust host process pass through Tauri's `invoke` bridge, wrapped by the type-safe `invokeApi<K>` generic function defined in `src/types/ipc.ts`.

### Connection & Session Commands

#### `get_saved_connection`
- **Description**: Reads the stored connection endpoint and username from `%APPDATA%/connection.json`.
- **Arguments**: None (`void`)
- **Returns**: `Promise<ConnectionConfig | null>`
- **Errors**: Returns `null` if no configuration file exists.

#### `connect`
- **Description**: Validates user credentials, normalizes the endpoint, performs an initial snapshot request, saves valid connection settings to disk, and stores the password in Windows Credential Manager. Automatically launches the 3-second background polling loop upon success.
- **Arguments**:
  ```ts
  { request: { endpoint: string; username: string; password: string } }
  ```
- **Returns**: `Promise<Snapshot>`
- **Errors**: `[auth]`, `[timeout]`, `[bad_request]`, `[unavailable]`

#### `refresh_monitor`
- **Description**: Manually triggers a immediate snapshot refresh using the saved endpoint and password retrieved from Windows Credential Manager.
- **Arguments**: None (`void`)
- **Returns**: `Promise<Snapshot>`
- **Errors**: `[bad_request]` (if not connected), `[auth]`, `[unavailable]`

#### `forget_connection`
- **Description**: Stops the background monitoring poller, deletes saved credentials from Windows Credential Manager, and removes `connection.json` from the local application data folder.
- **Arguments**: None (`void`)
- **Returns**: `Promise<void>`

---

### Telemetry & Monitoring Control Commands

#### `start_monitoring`
- **Description**: Spawns or resets the background Tokio async task polling server telemetry at the specified interval.
- **Arguments**: `{ intervalSecs?: number }` (Optional, defaults to 3s)
- **Returns**: `Promise<void>`

#### `stop_monitoring`
- **Description**: Aborts the active background Tokio polling task.
- **Arguments**: None (`void`)
- **Returns**: `Promise<void>`

---

### Server Operations & Management Commands

#### `announce_message`
- **Description**: Broadcasts an in-game system message to all connected players via the REST API endpoint `POST /v1/api/announce`.
- **Arguments**: `{ message: string }`
- **Returns**: `Promise<void>`
- **Errors**: `[network]`, `[server_error]`

#### `save_world`
- **Description**: Triggers an immediate server-side world state save via `POST /v1/api/save`.
- **Arguments**: None (`void`)
- **Returns**: `Promise<void>`
- **Errors**: `[network]`, `[server_error]`

#### `shutdown_server`
- **Description**: Initiates a server shutdown sequence after `waitTime` seconds, displaying `message` to connected players via `POST /v1/api/shutdown`.
- **Arguments**: `{ waitTime: number; message: string }`
- **Returns**: `Promise<void>`
- **Errors**: `[network]`, `[server_error]`

#### `stop_server`
- **Description**: Issues an immediate emergency server process termination call via `POST /v1/api/stop`.
- **Arguments**: None (`void`)
- **Returns**: `Promise<void>`
- **Errors**: `[network]`, `[server_error]`

---

### Moderation Commands

#### `kick_player`
- **Description**: Kicks a connected player identified by `userId` from the server via `POST /v1/api/kick`.
- **Arguments**: `{ userId: string; message: string }`
- **Returns**: `Promise<void>`
- **Errors**: `[network]`, `[server_error]`

#### `ban_player`
- **Description**: Kicks and permanently bans a player identified by `userId` via `POST /v1/api/ban`.
- **Arguments**: `{ userId: string; message: string }`
- **Returns**: `Promise<void>`
- **Errors**: `[network]`, `[server_error]`

#### `unban_player`
- **Description**: Removes a player `userId` from the server ban list via `POST /v1/api/unban`.
- **Arguments**: `{ userId: string }`
- **Returns**: `Promise<void>`
- **Errors**: `[network]`, `[server_error]`

#### `fetch_ban_list`
- **Description**: Retrieves the active list of banned players from `GET /v1/api/banlist`.
- **Arguments**: None (`void`)
- **Returns**: `Promise<unknown>` (Returns JSON array of banned entries)
- **Errors**: Returns empty array `[]` on failure or missing support.

---

## 2. Tauri Event Subscriptions

The application communicates background poller status to the React frontend via Tauri's event system.

```ts
import { onTelemetryUpdate, onTelemetryError } from "./api";

// Subscribe to 3s snapshot updates
const unlistenUpdate = await onTelemetryUpdate((snapshot: Snapshot) => {
  console.log("New server metrics:", snapshot.metrics.serverfps);
});

// Subscribe to poller errors
const unlistenError = await onTelemetryError((errorMsg: string) => {
  console.error("Poller error:", errorMsg);
});

// Unsubscribe on component unmount
unlistenUpdate();
unlistenError();
```

| Event Name | Payload Type | Description |
| :--- | :--- | :--- |
| `telemetry-update` | `Snapshot` | Emitted every polling cycle (3s) when telemetry fetching succeeds. |
| `telemetry-error` | `string` | Emitted when background polling fails (e.g. network timeout or server down). |

---

## 3. TypeScript Domain Data Schemas

### `Snapshot`
The aggregate state object returned by `connect` / `refresh_monitor` and emitted by `telemetry-update`:

```ts
export interface Snapshot {
  info: PalworldInfo;            // Server version, name, description, world GUID
  metrics: PalworldMetrics;      // FPS, frame time, player count, uptime, base camps, days
  players: PalworldPlayer[];     // Array of active connected player objects
  settings: PalworldSettings;    // Raw server configuration key-value dictionary
  gameData?: PalworldGameData;   // Optional detailed entity & actor information
  refreshedAt: string;           // ISO 8601 timestamp string (UTC)
}
```

### `PalworldMetrics`
```ts
export interface PalworldMetrics {
  serverfps: number;         // Server tick rate (target: 60 FPS)
  currentplayernum: number;  // Active online players
  maxplayernum: number;      // Maximum server player slot capacity
  uptime: number;            // Total continuous server uptime in seconds
  days: number;              // In-game days elapsed
  serverframetime: number;   // Server frametime in milliseconds
  basecampnum: number;       // Number of constructed base camps
}
```

### `PalworldPlayer`
```ts
export type PalworldPlayer = {
  name: string;              // In-game character name
  accountName: string;       // Steam / Xbox platform account name
  playerId: string;          // Player character ID
  user_id: string;           // Unique user identifier string
  ip: string;                // Client IP address
  ping: number;              // Network latency (ms)
  location_x: number;        // In-game X coordinate
  location_y: number;        // In-game Y coordinate
  level: number;             // Character level
  building_count: number;    // Number of player-owned structures
};
```

---

## 4. Palworld REST API Mapping

The Rust backend communicates with the Palworld server via standard Basic Authentication over HTTP.

| App Command / Poller | Palworld REST API Endpoint | HTTP Method | Payload / Parameters |
| :--- | :--- | :--- | :--- |
| Snapshot Poller | `/v1/api/info` | GET | `None` |
| Snapshot Poller | `/v1/api/metrics` | GET | `None` |
| Snapshot Poller | `/v1/api/players` | GET | `None` |
| Snapshot Poller | `/v1/api/settings` | GET | `None` |
| Snapshot Poller | `/v1/api/game-data` | GET | `None` |
| `announce_message` | `/v1/api/announce` | POST | `{ "message": string }` |
| `save_world` | `/v1/api/save` | POST | `None` |
| `shutdown_server` | `/v1/api/shutdown` | POST | `{ "waittime": number, "message": string }` |
| `stop_server` | `/v1/api/stop` | POST | `None` |
| `kick_player` | `/v1/api/kick` | POST | `{ "userid": string, "message": string }` |
| `ban_player` | `/v1/api/ban` | POST | `{ "userid": string, "message": string }` |
| `unban_player` | `/v1/api/unban` | POST | `{ "userid": string }` |
| `fetch_ban_list` | `/v1/api/banlist` | GET | `None` |
