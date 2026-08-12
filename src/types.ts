export type ConnectionStatus = 
  | 'idle' 
  | 'connecting' 
  | 'connected' 
  | 'auth_failed' 
  | 'server_unavailable' 
  | 'malformed_response';

export interface ConnectionConfig {
  endpoint: string;
  username: string;
}

export interface PalworldInfo {
  version: string;
  servername: string;
  description: string;
  worldguid: string;
}

export interface PalworldMetrics {
  serverfps: number;
  currentplayernum: number;
  maxplayernum: number;
  uptime: number; // seconds
  days: number;
  serverframetime: number; // ms
  basecampnum: number;
}

export type PalworldPlayer = {
  name: string;
  accountName: string;
  playerId: string;
  userId: string;
  ip: string;
  ping: number;
  location_x: number;
  location_y: number;
  level: number;
  building_count: number;
};

export type Player = PalworldPlayer;

export type PalworldSettingValue = string | number | boolean | string[] | null | unknown;
export type PalworldSettings = Record<string, PalworldSettingValue>;

export type Settings = PalworldSettings;

export type AppErrorCode = "auth" | "unavailable" | "bad_request" | "malformed_response" | "timeout" | "unknown";

export interface AppError {
  code: AppErrorCode;
  message: string;
}

export interface PalworldGameDataActor {
  actorType?: string;
  unitType?: string;
  name?: string;
  guildId?: string;
  guildName?: string;
  className?: string;
  userId?: string;
  ip?: string;
  locationX?: number;
  locationY?: number;
  locationZ?: number;
  level?: number;
  hp?: number;
  maxHp?: number;
  action?: string;
  aiAction?: string;
  gender?: string;
  isBoss?: boolean;
  isRare?: boolean;
}

export interface PalworldGameData {
  enabled: boolean;
  time?: string;
  fps?: number;
  averageFps?: number;
  inGameTime?: string;
  inGameDays?: number;
  actors?: PalworldGameDataActor[];
}

export interface Snapshot {
  info: PalworldInfo;
  metrics: PalworldMetrics;
  players: PalworldPlayer[];
  settings: PalworldSettings;
  gameData?: PalworldGameData | null;
  refreshedAt: string;
}

export interface ConnectionError {
  code: string;
  title: string;
  message: string;
  detail?: string;
  troubleshooting: string[];
  timestamp: string;
}

export type Branded<T, Brand extends string> = T & { readonly __brand: Brand };

export type PlayerId = Branded<string, "PlayerId">;
export type WorldGuid = Branded<string, "WorldGuid">;

export interface TestResult {
  id: string;
  name: string;
  category: 'Parsing' | 'Uptime' | 'Sorting' | 'Error Mapping' | 'WinCred';
  passed: boolean;
  durationMs: number;
  details: string;
}

export * from "./types/ipc";
export * from "./types/result";
export * from "./types/guards";

