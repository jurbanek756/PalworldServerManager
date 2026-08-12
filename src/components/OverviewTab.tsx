import React from 'react';
import { Activity, Users, Clock, Calendar, ShieldCheck, Server, Radio, Zap, Globe, Swords, Shield, Tent, Compass, Megaphone, Power, UserX, Save, RefreshCw } from 'lucide-react';
import { PalworldInfo, PalworldMetrics, PalworldSettings } from '../types';
import { formatFpsQuality, formatUptime } from '../api';
import { formatSettingValue } from '../format';
import { TelemetrySparkline, TelemetryPoint } from './TelemetrySparkline';

interface OverviewTabProps {
  info: PalworldInfo | null;
  metrics: PalworldMetrics | null;
  settings?: PalworldSettings | null;
  isLoading: boolean;
  onRefresh: () => void;
  telemetryHistory?: TelemetryPoint[];
  onOpenBroadcast?: () => void;
  onOpenServerControls?: () => void;
  onOpenBanList?: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  info,
  metrics,
  settings,
  isLoading,
  onRefresh,
  telemetryHistory = [],
  onOpenBroadcast,
  onOpenServerControls,
  onOpenBanList,
}) => {
  if (isLoading && !metrics) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-center bg-slate-900 border border-slate-800 rounded-lg">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-white font-medium text-sm">Querying Palworld REST API (/metrics & /info)...</p>
        <p className="text-slate-400 text-xs mt-1">Connecting to REST endpoint via HTTP Basic Auth</p>
      </div>
    );
  }

  const fps = metrics?.serverfps ?? 0;
  const fpsQuality = formatFpsQuality(fps);

  const playerPercentage = metrics?.maxplayernum 
    ? Math.round(((metrics.currentplayernum ?? 0) / metrics.maxplayernum) * 100) 
    : 0;

  // Extract crossplay platforms if available in settings
  const crossplayPlatforms = Array.isArray(settings?.CrossplayPlatforms)
    ? (settings.CrossplayPlatforms as string[])
    : ['Steam', 'Xbox', 'PS5', 'Mac'];

  const isPvP = Boolean(settings?.bIsPvP);
  const isHardcore = Boolean(settings?.bHardcore);
  const difficulty = settings?.Difficulty ? String(settings.Difficulty) : 'Normal';

  return (
    <div className="space-y-6">
      {/* Top Banner & Header Status */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {info?.servername || "Palworld Dedicated Server"}
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Version {info?.version || 'v0.3.8.0'} • World ID: {info?.worldguid || '9f82-a3c2-d3b1-f921'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Action Hub Buttons */}
          {onOpenBroadcast && (
            <button
              onClick={onOpenBroadcast}
              className="bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
            >
              <Megaphone className="w-3.5 h-3.5" /> Broadcast Hub
            </button>
          )}

          {onOpenServerControls && (
            <button
              onClick={onOpenServerControls}
              className="bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" /> Server Controls
            </button>
          )}

          {onOpenBanList && (
            <button
              onClick={onOpenBanList}
              className="bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/40 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
            >
              <UserX className="w-3.5 h-3.5" /> Ban Manager
            </button>
          )}

          <button
            onClick={onRefresh}
            title="Refresh Data"
            aria-label="Refresh Data"
            className="bg-cyan-400 text-slate-950 p-2 rounded-md hover:bg-white transition-colors active:translate-y-0.5 shadow-[0_4px_14px_rgba(34,211,238,0.2)] cursor-pointer flex items-center justify-center"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Server FPS */}
        <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-teal-400 font-bold tracking-wider uppercase">Server FPS</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="text-3xl font-mono font-bold text-white">
              {metrics ? metrics.serverfps.toFixed(2) : '60.00'}
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 mt-2 uppercase font-medium">
            {fpsQuality.text}
          </span>
        </div>

        {/* Card 2: Active Players */}
        <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-teal-400 font-bold tracking-wider uppercase">Active Players</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-mono font-bold text-white">
                {metrics ? metrics.currentplayernum : 0}
              </span>
              <span className="text-sm font-mono opacity-40 text-slate-300">
                / {metrics ? metrics.maxplayernum : 32}
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-800 h-1.5 mt-2 rounded-full overflow-hidden">
            <div 
              className="bg-cyan-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
              style={{ width: `${Math.max(5, playerPercentage)}%` }}
            ></div>
          </div>
        </div>

        {/* Card 3: Uptime */}
        <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-teal-400 font-bold tracking-wider uppercase">Uptime</span>
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="text-2xl font-mono font-bold text-white truncate block">
              {metrics ? formatUptime(metrics.uptime) : '0s'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-2 uppercase">
            Frame Time: {metrics ? `${metrics.serverframetime.toFixed(1)} ms` : '16.6 ms'}
          </span>
        </div>

        {/* Card 4: In-Game Cycle */}
        <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-teal-400 font-bold tracking-wider uppercase">In-Game Cycle</span>
              <Calendar className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="text-2xl font-mono font-bold text-white">
              Day {metrics ? metrics.days : 1}
            </span>
          </div>
          <span className="text-[10px] text-amber-400 mt-2 uppercase">
            Base Camps: {metrics?.basecampnum ?? 0} Active
          </span>
        </div>
      </div>

      {/* Telemetry Sparklines Component */}
      <TelemetrySparkline history={telemetryHistory} />

      {/* World & Gameplay Configuration Highlights */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Compass className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">
              World Configuration & Gameplay Rules
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              isPvP ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
            }`}>
              {isPvP ? 'PvP Enabled' : 'PvE Co-Op'}
            </span>
            {isHardcore && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Hardcore
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Box 1: Mode & Platforms */}
          <div className="bg-slate-950 p-3.5 rounded border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Crossplay Platforms</span>
              <Globe className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {crossplayPlatforms.map((plat) => (
                <span key={plat} className="px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-700/80 text-[11px] font-mono font-medium">
                  {plat}
                </span>
              ))}
            </div>
            <div className="text-[11px] text-slate-400 pt-1">
              Difficulty: <strong className="text-white font-semibold">{difficulty}</strong>
            </div>
          </div>

          {/* Box 2: World Multipliers */}
          <div className="bg-slate-950 p-3.5 rounded border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">World Multipliers</span>
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1">
              <div>
                <span className="text-slate-500 block text-[10px]">EXP Rate:</span>
                <span className="font-mono text-cyan-300 font-bold">{settings?.ExpRate ? `${formatSettingValue(settings.ExpRate)}x` : '1x'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Capture Rate:</span>
                <span className="font-mono text-cyan-300 font-bold">{settings?.PalCaptureRate ? `${formatSettingValue(settings.PalCaptureRate)}x` : '1x'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Spawn Density:</span>
                <span className="font-mono text-cyan-300 font-bold">{settings?.PalSpawnNumRate ? `${formatSettingValue(settings.PalSpawnNumRate)}x` : '1x'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Work Speed:</span>
                <span className="font-mono text-cyan-300 font-bold">{settings?.WorkSpeedRate ? `${formatSettingValue(settings.WorkSpeedRate)}x` : '1x'}</span>
              </div>
            </div>
          </div>

          {/* Box 3: Base Camp & Guild Caps */}
          <div className="bg-slate-950 p-3.5 rounded border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Base & Guild Caps</span>
              <Tent className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1">
              <div>
                <span className="text-slate-500 block text-[10px]">Max Guild Players:</span>
                <span className="font-mono text-emerald-400 font-bold">{settings?.GuildPlayerMaxNum != null ? formatSettingValue(settings.GuildPlayerMaxNum) : '20'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Bases per Guild:</span>
                <span className="font-mono text-emerald-400 font-bold">{settings?.BaseCampMaxNumInGuild != null ? formatSettingValue(settings.BaseCampMaxNumInGuild) : '4'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Workers per Base:</span>
                <span className="font-mono text-emerald-400 font-bold">{settings?.BaseCampWorkerMaxNum != null ? formatSettingValue(settings.BaseCampWorkerMaxNum) : '15'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Total Server Bases:</span>
                <span className="font-mono text-emerald-400 font-bold">{settings?.BaseCampMaxNum != null ? formatSettingValue(settings.BaseCampMaxNum) : '128'}</span>
              </div>
            </div>
          </div>

          {/* Box 4: Active World Rules */}
          <div className="bg-slate-950 p-3.5 rounded border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Rules</span>
              <Shield className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="space-y-1 text-[11px] pt-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px]">Fast Travel:</span>
                <span className={`font-bold ${settings?.bEnableFastTravel !== false ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {settings?.bEnableFastTravel !== false ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px]">Invader Enemies:</span>
                <span className={`font-bold ${settings?.bEnableInvaderEnemy ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {settings?.bEnableInvaderEnemy ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px]">Death Penalty:</span>
                <span className="font-mono text-cyan-300 font-bold">{String(settings?.DeathPenalty || 'None')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
