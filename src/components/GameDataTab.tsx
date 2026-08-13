import React, { useState, useMemo } from 'react';
import { Database, Search, Copy, Check, ShieldAlert, Cpu, Box, Package, Flame, Sparkles, MapPin, RefreshCw, Layers, Compass, Clock, Activity, Zap, Users, Heart, Hammer, Moon, BookOpen } from 'lucide-react';
import { PalworldGameData } from '../types';
import { PaldexService } from '../services/paldexService';
import { PaldexEntry } from '../types/paldex';
import { PalDetailModal } from './PalDetailModal';

interface GameDataTabProps {
  gameData?: PalworldGameData | null;
  isLoading: boolean;
  onRefresh: () => void;
}

const normalizeActor = (a: any) => {
  const actorType = String(a.actorType || a.Type || a.type || '');
  const unitType = String(a.unitType || a.UnitType || a.unit_type || '');
  const name = String(a.name || a.NickName || a.Name || a.nick_name || '');
  const guildName = String(a.guildName || a.GuildName || a.guild_name || '');
  const guildId = String(a.guildId || a.GuildID || a.guild_id || '');
  const className = String(a.className || a.Class || a.class_name || '');
  const userId = String(a.userId || a.userid || a.user_id || '');
  const ip = String(a.ip || a.IP || '');
  const locationX = a.locationX ?? a.LocationX ?? a.location_x;
  const locationY = a.locationY ?? a.LocationY ?? a.location_y;
  const locationZ = a.locationZ ?? a.LocationZ ?? a.location_z;
  const level = a.level ?? a.Level;
  const hp = a.hp ?? a.HP;
  const maxHp = a.maxHp ?? a.MaxHP;
  const action = String(a.action || a.Action || '');
  const aiAction = String(a.aiAction || a.AI_Action || a.ai_action || '');
  const isBoss = Boolean(a.isBoss ?? a.IsBoss);
  const isRare = Boolean(a.isRare ?? a.IsRare);

  return {
    actorType,
    unitType,
    name,
    guildName,
    guildId,
    className,
    userId,
    ip,
    locationX,
    locationY,
    locationZ,
    level,
    hp,
    maxHp,
    action,
    aiAction,
    isBoss,
    isRare,
  };
};

export const GameDataTab: React.FC<GameDataTabProps> = ({
  gameData,
  isLoading,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>('all');
  const [copiedFlag, setCopiedFlag] = useState(false);
  const [selectedDossierPal, setSelectedDossierPal] = useState<PaldexEntry | null>(null);

  const handleCopyFlag = () => {
    navigator.clipboard.writeText('-enable-gamedata-api');
    setCopiedFlag(true);
    setTimeout(() => setCopiedFlag(false), 2000);
  };

  const isApiEnabled = gameData?.enabled ?? false;

  // Normalized Real Palworld Server Actors list
  const realActors = useMemo(() => {
    const rawList = gameData?.actors || [];
    return rawList.map(normalizeActor);
  }, [gameData]);

  const filteredActors = useMemo(() => {
    return realActors.filter((actor) => {
      const typeStr = actor.actorType.toLowerCase();
      const unitStr = actor.unitType.toLowerCase();
      const classStr = actor.className.toLowerCase();
      const actStr = actor.action.toLowerCase();
      const aiStr = actor.aiAction.toLowerCase();
      
      let matchType = true;
      if (activeTypeFilter === 'player') {
        matchType = unitStr === 'player' || classStr.includes('player');
      } else if (activeTypeFilter === 'basepal') {
        matchType = unitStr === 'basecamppal';
      } else if (activeTypeFilter === 'palbox') {
        matchType = typeStr.includes('palbox');
      } else if (activeTypeFilter === 'working') {
        matchType = Boolean(actor.action && !actStr.includes('sleep') && !aiStr.includes('sleep'));
      } else if (activeTypeFilter === 'sleeping') {
        matchType = actStr.includes('sleep') || aiStr.includes('sleep');
      }

      if (!matchType) return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        actor.name.toLowerCase().includes(q) ||
        actor.actorType.toLowerCase().includes(q) ||
        actor.unitType.toLowerCase().includes(q) ||
        actor.guildName.toLowerCase().includes(q) ||
        actor.className.toLowerCase().includes(q) ||
        actor.action.toLowerCase().includes(q) ||
        actor.userId.toLowerCase().includes(q) ||
        actor.ip.toLowerCase().includes(q)
      );
    });
  }, [realActors, searchQuery, activeTypeFilter]);

  const stats = useMemo(() => {
    const total = realActors.length;
    const players = realActors.filter(a => a.unitType.toLowerCase() === 'player' || a.className.toLowerCase().includes('player')).length;
    const basePals = realActors.filter(a => a.unitType.toLowerCase() === 'basecamppal').length;
    const palboxes = realActors.filter(a => a.actorType.toLowerCase().includes('palbox')).length;
    const sleepingPals = realActors.filter(a => a.action.toLowerCase().includes('sleep') || a.aiAction.toLowerCase().includes('sleep')).length;
    const workingPals = realActors.filter(a => Boolean(a.action && !a.action.toLowerCase().includes('sleep') && !a.aiAction.toLowerCase().includes('sleep'))).length;

    return { total, players, basePals, palboxes, sleepingPals, workingPals };
  }, [realActors]);

  const formatActivityBadge = (action?: string, aiAction?: string) => {
    if (!action && !aiAction) return null;

    const act = (action || '').toLowerCase();
    const ai = (aiAction || '').toLowerCase();

    if (act.includes('sleep') || ai.includes('sleep')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border bg-indigo-500/20 border-indigo-500/40 text-indigo-300">
          <Moon className="w-3 h-3 mr-1 text-indigo-400" /> Sleeping in Bed
        </span>
      );
    }
    if (act.includes('mining')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border bg-amber-500/20 border-amber-500/40 text-amber-300">
          ⛏️ Mining
        </span>
      );
    }
    if (act.includes('watering')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border bg-cyan-500/20 border-cyan-500/40 text-cyan-300">
          💧 Watering
        </span>
      );
    }
    if (act.includes('electric')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border bg-yellow-500/20 border-yellow-500/40 text-yellow-300">
          ⚡ Generating Power
        </span>
      );
    }
    if (act.includes('deforest')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border bg-emerald-500/20 border-emerald-500/40 text-emerald-300">
          🪵 Lumbering
        </span>
      );
    }
    if (act.includes('transport')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border bg-teal-500/20 border-teal-500/40 text-teal-300">
          🚚 Transporting Items
        </span>
      );
    }
    if (act.includes('eat')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border bg-rose-500/20 border-rose-500/40 text-rose-300">
          🍖 Eating
        </span>
      );
    }
    if (act.includes('feeding')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border bg-green-500/20 border-green-500/40 text-green-300">
          🌱 Farming
        </span>
      );
    }
    if (ai.includes('working')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border bg-cyan-500/20 border-cyan-500/40 text-cyan-300">
          🛠️ Working
        </span>
      );
    }
    if (ai.includes('approach')) {
      label: '🚶 Approaching Task';
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border bg-slate-800 border-slate-700 text-slate-300">
          🚶 Approaching Task
        </span>
      );
    }
    if (ai.includes('wait')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border bg-slate-900 border-slate-800 text-slate-400">
          💤 Idling
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border bg-slate-800 border-slate-700 text-slate-300">
        ⚡ {action || aiAction}
      </span>
    );
  };

  const getElementColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'fire': return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      case 'water': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';
      case 'grass': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'electric': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      case 'ice': return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'ground': return 'bg-amber-600/20 text-amber-400 border-amber-500/40';
      case 'dragon': return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'dark': return 'bg-slate-700/40 text-slate-300 border-slate-600';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Pal & World Entity Explorer
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Inspect live server world actors, base camp working Pals, player positions, and PalBoxes via <code className="text-cyan-400">GET /v1/api/game-data</code>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded text-xs font-mono font-bold border ${
            isApiEnabled 
              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40' 
              : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
          }`}>
            {isApiEnabled ? 'GAME DATA API: ACTIVE (200 OK)' : 'GAME DATA API: REQUIRES LAUNCH FLAG'}
          </span>

          <button
            onClick={onRefresh}
            title="Refresh Data"
            aria-label="Refresh Data"
            className="bg-cyan-400 text-slate-950 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer flex items-center justify-center shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Real Server Telemetry Bar */}
      {isApiEnabled && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider block">Game Server Time</span>
              <span className="text-xl font-mono font-bold text-white mt-0.5 block">{gameData?.inGameTime || '12:00'}</span>
            </div>
            <Clock className="w-5 h-5 text-cyan-400" />
          </div>

          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider block">In-Game Days</span>
              <span className="text-xl font-mono font-bold text-white mt-0.5 block">Day {gameData?.inGameDays ?? '-'}</span>
            </div>
            <Compass className="w-5 h-5 text-teal-400" />
          </div>

          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider block">Real-Time FPS</span>
              <span className="text-xl font-mono font-bold text-emerald-400 mt-0.5 block">{gameData?.fps ? gameData.fps.toFixed(1) : '60.0'}</span>
            </div>
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>

          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider block">Average FPS</span>
              <span className="text-xl font-mono font-bold text-cyan-300 mt-0.5 block">{gameData?.averageFps ? gameData.averageFps.toFixed(1) : '60.0'}</span>
            </div>
            <Zap className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
      )}

      {/* Game Data API Launch Flag Notice Card (if disabled) */}
      {!isApiEnabled && (
        <div className="bg-slate-900/90 rounded-lg border border-amber-500/30 p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                  Palworld Game Data API Enablement Guide
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  The <code className="text-cyan-400 font-mono">GET /v1/api/game-data</code> endpoint requires enabling an explicit startup argument on your Palworld Dedicated Server.
                </p>
              </div>
            </div>

            <button
              onClick={handleCopyFlag}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-cyan-300 rounded border border-cyan-500/30 text-xs font-mono transition cursor-pointer shrink-0"
            >
              {copiedFlag ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{copiedFlag ? 'Copied Flag!' : 'Copy -enable-gamedata-api'}</span>
            </button>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-slate-800 text-xs space-y-2">
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block">Startup Command Example:</span>
            <code className="text-cyan-400 font-mono block bg-slate-900 p-2 rounded border border-slate-800 text-[11px] overflow-x-auto">
              PalServer.exe -enable-gamedata-api -port=8211 -players=16
            </code>
          </div>
        </div>
      )}

      {/* World Entity Metrics KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">Total Actors</span>
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <span className="text-2xl font-mono font-bold text-white">{stats.total}</span>
        </div>

        <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">Online Players</span>
            <Users className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <span className="text-2xl font-mono font-bold text-cyan-300">{stats.players}</span>
        </div>

        <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">Base Camp Pals</span>
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-2xl font-mono font-bold text-emerald-400">{stats.basePals}</span>
        </div>

        <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">Active Workers</span>
            <Hammer className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="text-2xl font-mono font-bold text-amber-300">{stats.workingPals}</span>
        </div>

        <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">Sleeping Pals</span>
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <span className="text-2xl font-mono font-bold text-indigo-300">{stats.sleepingPals}</span>
        </div>

        <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">PalBoxes</span>
            <Box className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <span className="text-2xl font-mono font-bold text-purple-300">{stats.palboxes}</span>
        </div>
      </div>

      {/* Search Header & Type Filter Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-teal-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search live server actors by name, type, guild, class, or IP (e.g. Joe, Jormuntide, Broncherry, PalBox)..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none font-sans"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {[
              { id: 'all', label: 'All Actors' },
              { id: 'player', label: 'Players' },
              { id: 'basepal', label: 'Base Camp Pals' },
              { id: 'working', label: 'Active Workers' },
              { id: 'sleeping', label: 'Sleeping Pals' },
              { id: 'palbox', label: 'PalBoxes' }
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveTypeFilter(filter.id)}
                className={`px-3 py-1 rounded text-[11px] font-medium transition cursor-pointer shrink-0 ${
                  activeTypeFilter === filter.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actor Inspector Cards Grid */}
      {filteredActors.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center text-slate-400 text-xs">
          <Database className="w-8 h-8 text-slate-800 mx-auto mb-2" />
          {isApiEnabled && realActors.length === 0 
            ? 'No actors currently returned by /v1/api/game-data.' 
            : 'No world actors matched your search query or filter.'}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 items-stretch">
          {filteredActors.map((actor, idx) => {
            const isPlayer = actor.unitType.toLowerCase() === 'player' || actor.className.toLowerCase().includes('player');
            const isPalBox = actor.actorType.toLowerCase().includes('palbox');
            const isPal = actor.unitType.toLowerCase().includes('pal') || actor.actorType.toLowerCase().includes('character');
            const paldexEntry = PaldexService.getEntry(actor.name || actor.className || actor.actorType);

            return (
              <div 
                key={idx} 
                onClick={() => paldexEntry && setSelectedDossierPal(paldexEntry)}
                className={`p-4 rounded-lg border flex flex-col justify-between h-full space-y-3 transition ${
                  paldexEntry ? 'cursor-pointer hover:border-cyan-500/50 group' : ''
                } ${
                  isPlayer 
                    ? 'bg-slate-950/90 border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.1)]' 
                    : isPalBox 
                    ? 'bg-slate-950/90 border-purple-500/30 hover:border-purple-400' 
                    : 'bg-slate-950 hover:bg-slate-900/80 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Card Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      {paldexEntry && (
                        <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30 shrink-0">
                          #{paldexEntry.key}
                        </span>
                      )}
                      <span className="text-sm font-bold text-white truncate max-w-[180px] group-hover:text-cyan-300 transition" title={actor.name}>
                        {actor.name || actor.actorType || 'Actor'}
                      </span>
                      {actor.isBoss && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-0.5 shrink-0">
                          <Flame className="w-2.5 h-2.5" /> Boss
                        </span>
                      )}
                      {actor.isRare && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-0.5 shrink-0">
                          <Sparkles className="w-2.5 h-2.5" /> Lucky
                        </span>
                      )}
                    </div>
                    
                    <span className="text-[10px] font-mono text-cyan-400 block mt-0.5 truncate max-w-[220px]" title={actor.className}>
                      {actor.className || actor.actorType}
                    </span>

                    {paldexEntry && (
                      <div className="flex items-center gap-1 mt-1">
                        {paldexEntry.types.map((t, ti) => (
                          <span key={ti} className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border flex items-center gap-1 ${getElementColor(t.name)}`}>
                            {t.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                      isPlayer 
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40' 
                        : isPalBox 
                        ? 'bg-purple-950 text-purple-300 border border-purple-500/40' 
                        : 'bg-slate-900 text-teal-300 border border-slate-800'
                    }`}>
                      {actor.unitType || actor.actorType || 'Entity'}
                    </span>

                    {actor.level !== undefined && (
                      <span className="text-xs font-mono font-bold text-amber-400">
                        Lv. {actor.level}
                      </span>
                    )}
                  </div>
                </div>

                {/* Pal Paldex Image & Work Suitabilities Block */}
                {paldexEntry && (
                  <div className="flex gap-3 bg-slate-900/60 p-2.5 rounded-lg border border-slate-900/80 items-center">
                    <div className="w-14 h-14 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center p-1 shrink-0">
                      <img
                        src={paldexEntry.image}
                        alt={paldexEntry.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          if (paldexEntry.imageWiki) (e.target as HTMLImageElement).src = paldexEntry.imageWiki;
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider font-mono block">Work Suitabilities</span>
                      {paldexEntry.suitability && paldexEntry.suitability.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {paldexEntry.suitability.map((s, si) => {
                            const audit = PaldexService.auditWorkSuitability(paldexEntry, actor.action || actor.aiAction);
                            const isMatched = audit.isOptimal && audit.matchedType === s.type;
                            return (
                              <span
                                key={si}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono flex items-center gap-1 border ${
                                  isMatched
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                                    : 'bg-slate-950 text-slate-300 border-slate-800'
                                }`}
                                title={isMatched ? `Active task matches ${s.type}` : `${s.type} Level ${s.level}`}
                              >
                                {s.image && (
                                  <img src={s.image} alt={s.type} className="w-3 h-3 object-contain shrink-0" />
                                )}
                                <span className="capitalize">{s.type.replace(/_/g, ' ')}</span>
                                <span className="text-cyan-400 font-bold">L{s.level}</span>
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">None</span>
                      )}
                    </div>
                  </div>
                )}

                {/* HP Bar if available */}
                {actor.hp !== undefined && actor.maxHp !== undefined && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-400">Health:</span>
                      <span className="text-cyan-300 font-bold">{actor.hp} / {actor.maxHp}</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className="bg-emerald-400 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(5, (actor.hp / actor.maxHp) * 100))}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Activity & Action Badge */}
                {(actor.action || actor.aiAction) && (
                  <div className="pt-1">
                    {formatActivityBadge(actor.action, actor.aiAction)}
                  </div>
                )}

                {/* Player details (IP & UserID) */}
                {isPlayer && (actor.ip || actor.userId) && (
                  <div className="text-[10px] font-mono text-slate-400 space-y-0.5 bg-slate-900/60 p-2 rounded border border-slate-800">
                    {actor.ip && (
                      <div>IP: <span className="text-cyan-300 font-bold">{actor.ip}</span></div>
                    )}
                    {actor.userId && (
                      <div>ID: <span className="text-slate-300">{actor.userId}</span></div>
                    )}
                  </div>
                )}

                {/* Location & Guild Ownership Info */}
                <div className="pt-2 border-t border-slate-900/80 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-teal-400 shrink-0" />
                    <span className="font-mono text-[10px]">
                      {actor.locationX !== undefined ? `${actor.locationX.toFixed(0)}, ${actor.locationY?.toFixed(0)}` : 'World'}
                    </span>
                  </div>

                  <div className="truncate max-w-[140px]" title={actor.guildName || actor.guildId}>
                    {actor.guildName ? (
                      <span className="text-emerald-400 font-medium">{actor.guildName}</span>
                    ) : actor.guildId ? (
                      <span className="text-cyan-300 font-mono text-[10px]">ID: {actor.guildId.substring(0, 8)}...</span>
                    ) : (
                      <span className="text-slate-500 italic">Unassigned</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pal Dossier Modal */}
      <PalDetailModal
        pal={selectedDossierPal}
        isOpen={Boolean(selectedDossierPal)}
        onClose={() => setSelectedDossierPal(null)}
      />
    </div>
  );
};
