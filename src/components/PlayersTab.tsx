import React, { useState, useMemo } from 'react';
import { Search, ArrowUp, ArrowDown, MapPin, Crosshair, X, UserMinus, ShieldAlert, Check, AlertTriangle, UserX } from 'lucide-react';
import { PalworldPlayer } from '../types';
import { kickPlayer, banPlayer, parseError, formatPing } from '../api';
import { HabitantHistoryTable } from './HabitantHistoryTable';

interface PlayersTabProps {
  players: PalworldPlayer[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenBanList?: () => void;
}

type SortField = 'name' | 'level' | 'ping' | 'building_count' | 'accountName' | 'ip';
type SortDirection = 'asc' | 'desc';

function formatCoordinates(x: number, y: number): string {
  if (x === 0 && y === 0) return "X: 0, Y: 0";
  const mapX = Math.round(x / 100);
  const mapY = Math.round(y / 100);
  return `X: ${mapX}, Y: ${mapY}`;
}

export const PlayersTab: React.FC<PlayersTabProps> = ({
  players,
  onOpenBanList,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('level');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [selectedPlayer, setSelectedPlayer] = useState<PalworldPlayer | null>(null);

  // Moderation Dialog State
  const [actionPlayer, setActionPlayer] = useState<{ player: PalworldPlayer; type: 'kick' | 'ban' } | null>(null);
  const [modReason, setModReason] = useState('');
  const [isModifying, setIsModifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'level' || field === 'building_count' || field === 'ping' ? 'desc' : 'asc');
    }
  };

  const handleExecuteModeration = async () => {
    if (!actionPlayer) return;
    setIsModifying(true);
    setStatusMessage(null);

    const userId = actionPlayer.player.userId || actionPlayer.player.playerId;

    try {
      if (actionPlayer.type === 'kick') {
        await kickPlayer(userId, modReason.trim() || 'Kicked by server admin');
        setStatusMessage({ type: 'success', text: `Player ${actionPlayer.player.name} has been kicked.` });
      } else {
        await banPlayer(userId, modReason.trim() || 'Banned by server admin');
        setStatusMessage({ type: 'success', text: `Player ${actionPlayer.player.name} has been banned.` });
      }
      setActionPlayer(null);
      setModReason('');
    } catch (err: unknown) {
      const parsed = parseError(err instanceof Error ? err.message : String(err));
      setStatusMessage({ type: 'error', text: `${parsed.title}: ${parsed.message}` });
    } finally {
      setIsModifying(false);
    }
  };

  const filteredAndSortedPlayers = useMemo(() => {
    return players
      .filter((p) => {
        const matchesSearch = 
          (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.accountName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.ip || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.playerId || '').toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        if (levelFilter === '1-20') return p.level >= 1 && p.level <= 20;
        if (levelFilter === '21-40') return p.level >= 21 && p.level <= 40;
        if (levelFilter === '41-50') return p.level >= 41 && p.level <= 50;

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField] ?? '';
        let valB: any = b[sortField] ?? '';

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [players, searchQuery, levelFilter, sortField, sortDir]);

  const getPingBadge = (ping: number) => {
    const formatted = formatPing(ping);
    if (ping <= 30) {
      return <span className="text-emerald-400 font-mono text-xs">{formatted}</span>;
    } else if (ping <= 70) {
      return <span className="text-amber-400 font-mono text-xs">{formatted}</span>;
    } else {
      return <span className="text-rose-400 font-mono text-xs">{formatted}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Control Header & Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[240px] sm:min-w-[320px]">
          <Search className="w-4 h-4 text-teal-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by player name, account ID, or IP..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none font-mono"
          />
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="text-teal-400 font-bold text-[10px] uppercase">Level Filter:</span>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white rounded px-2 py-1 text-xs focus:outline-none"
            >
              <option value="all">All Levels (1-50)</option>
              <option value="1-20">Novice (Lvl 1-20)</option>
              <option value="21-40">Veteran (Lvl 21-40)</option>
              <option value="41-50">Endgame (Lvl 41-50)</option>
            </select>
          </div>

          <div className="px-3 py-1 bg-slate-950 rounded border border-slate-800 font-mono text-xs text-slate-300">
            Active Players: <span className="text-cyan-400 font-bold">{filteredAndSortedPlayers.length}</span>
          </div>

          {onOpenBanList && (
            <button
              onClick={onOpenBanList}
              className="px-3 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <UserX className="w-3.5 h-3.5" /> Ban List Manager
            </button>
          )}
        </div>
      </div>

      {/* Status Message Banner */}
      {statusMessage && (
        <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300' 
            : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
        }`}>
          {statusMessage.type === 'success' ? <Check className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Players Table */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">Current Inhabitants</h3>
          <span className="text-[10px] text-slate-400">Live REST API Inhabitants Table</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/50 sticky top-0">
              <tr className="text-teal-400 border-b border-slate-800 text-[11px]">
                <th 
                  onClick={() => handleSort('name')} 
                  className="px-4 py-2 font-medium cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center gap-1">
                    Player Name
                    {sortField === 'name' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />)}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('level')} 
                  className="px-4 py-2 font-medium cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center gap-1">
                    Level
                    {sortField === 'level' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />)}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('ping')} 
                  className="px-4 py-2 font-medium cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center gap-1">
                    Ping
                    {sortField === 'ping' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />)}
                  </div>
                </th>

                <th className="px-4 py-2 font-medium">Location</th>

                <th 
                  onClick={() => handleSort('building_count')} 
                  className="px-4 py-2 font-medium cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center gap-1">
                    Buildings
                    {sortField === 'building_count' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />)}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('accountName')} 
                  className="px-4 py-2 font-medium cursor-pointer hover:text-white transition"
                >
                  Account ID
                </th>

                <th className="px-4 py-2 font-medium text-right">Moderation Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredAndSortedPlayers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs">
                    No matching player records found on the server.
                  </td>
                </tr>
              ) : (
                filteredAndSortedPlayers.map((p, idx) => (
                  <tr 
                    key={p.playerId || idx} 
                    className="hover:bg-slate-800/40 transition cursor-pointer"
                    onClick={() => setSelectedPlayer(p)}
                  >
                    <td className="px-4 py-3 font-medium text-white flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-slate-800 text-cyan-400 font-bold text-[10px] flex items-center justify-center border border-teal-500/30 shrink-0">
                        {(p.name || 'P').charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate max-w-[180px]">{p.name || 'Unknown'}</span>
                    </td>

                    <td className="px-4 py-3 font-mono font-bold text-white">{p.level}</td>

                    <td className="px-4 py-3">{getPingBadge(p.ping)}</td>

                    <td className="px-4 py-3 font-mono opacity-80 text-[11px]">
                      {formatCoordinates(p.location_x, p.location_y)}
                    </td>

                    <td className="px-4 py-3 font-mono">{p.building_count}</td>

                    <td className="px-4 py-3 font-mono opacity-60 text-[11px] truncate max-w-[150px]">
                      {p.accountName || p.userId || 'N/A'}
                    </td>

                    <td className="px-4 py-3 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedPlayer(p)}
                        className="px-2 py-1 bg-slate-800 hover:bg-cyan-400 hover:text-slate-950 text-cyan-400 rounded text-[10px] font-bold uppercase transition cursor-pointer"
                      >
                        Inspect
                      </button>

                      <button
                        onClick={() => setActionPlayer({ player: p, type: 'kick' })}
                        className="px-2 py-1 bg-amber-950/80 hover:bg-amber-800 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold uppercase transition cursor-pointer"
                      >
                        Kick
                      </button>

                      <button
                        onClick={() => setActionPlayer({ player: p, type: 'ban' })}
                        className="px-2 py-1 bg-rose-950/80 hover:bg-rose-800 text-rose-300 border border-rose-500/30 rounded text-[10px] font-bold uppercase transition cursor-pointer"
                      >
                        Ban
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Habitant History (PostgreSQL Database) */}
      <HabitantHistoryTable />

      {/* Moderation Action Prompt Modal */}
      {actionPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <ShieldAlert className="w-4 h-4" />
                <span>Confirm {actionPlayer.type === 'kick' ? 'Kick' : 'Ban'} Action</span>
              </div>
              <button onClick={() => setActionPlayer(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to <strong className="text-white">{actionPlayer.type}</strong> player <strong className="text-cyan-300">{actionPlayer.player.name}</strong>?
            </p>

            <div>
              <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                Reason (Optional):
              </label>
              <input
                type="text"
                value={modReason}
                onChange={(e) => setModReason(e.target.value)}
                placeholder="Enter kick/ban reason..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded p-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setActionPlayer(null)}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded text-xs transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                disabled={isModifying}
                onClick={handleExecuteModeration}
                className={`px-4 py-1.5 rounded text-xs font-bold uppercase transition cursor-pointer text-slate-950 ${
                  actionPlayer.type === 'kick'
                    ? 'bg-amber-500 hover:bg-amber-400'
                    : 'bg-rose-500 hover:bg-rose-400'
                }`}
              >
                {isModifying ? 'Processing...' : `Confirm ${actionPlayer.type.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Player Inspector Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-md w-full overflow-hidden shadow-2xl text-slate-200">
            <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-xs text-white uppercase tracking-wider">Player Inspector: {selectedPlayer.name}</h3>
              </div>
              <button 
                onClick={() => setSelectedPlayer(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 text-center relative overflow-hidden">
                <div className="py-4">
                  <div className="w-10 h-10 rounded-full bg-cyan-400/20 border border-cyan-400 mx-auto flex items-center justify-center animate-pulse mb-2">
                    <MapPin className="w-5 h-5 text-cyan-400" />
                  </div>
                  
                  <div className="font-mono text-sm font-bold text-white">
                    {formatCoordinates(selectedPlayer.location_x, selectedPlayer.location_y)}
                  </div>
                  <div className="text-[10px] text-teal-400 mt-1 uppercase font-bold tracking-wider">
                    Palpagos Island Coordinates
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                  <div className="text-[10px] text-teal-400">Player Level</div>
                  <div className="text-white font-bold text-sm">Level {selectedPlayer.level}</div>
                </div>

                <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                  <div className="text-[10px] text-teal-400">Network Ping</div>
                  <div className="text-emerald-400 font-bold text-sm">{formatPing(selectedPlayer.ping)}</div>
                </div>

                <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                  <div className="text-[10px] text-teal-400">Structures Built</div>
                  <div className="text-cyan-400 font-bold text-sm">{selectedPlayer.building_count} Base Items</div>
                </div>

                <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                  <div className="text-[10px] text-teal-400">IP Address</div>
                  <div className="text-slate-300 font-bold text-[11px] truncate">{selectedPlayer.ip || '127.0.0.1'}</div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 text-right">
              <button
                onClick={() => setSelectedPlayer(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-cyan-400 hover:text-slate-950 text-white rounded text-xs uppercase font-bold transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
