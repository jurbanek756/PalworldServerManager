import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Database, Search, RefreshCw, ArrowUp, ArrowDown, Clock, Users, History, Info, X, Activity, HardDrive, Folder } from 'lucide-react';
import { HabitantHistoryRecord, HabitantSessionRecord, SqliteInfo } from '../types';
import { fetchHabitantHistory, fetchPlayerSessions, getSqliteInfo, formatUptime } from '../api';

type SortField = 'name' | 'maxLevel' | 'totalPlaytimeSeconds' | 'firstSeen' | 'lastSeen' | 'isOnline';
type SortDirection = 'asc' | 'desc';

function formatDate(isoStr: string): string {
  if (!isoStr) return 'N/A';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const HabitantHistoryTable: React.FC = () => {
  const [historyRecords, setHistoryRecords] = useState<HabitantHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sqliteInfo, setSqliteInfo] = useState<SqliteInfo | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [sortField, setSortField] = useState<SortField>('lastSeen');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // Selected Player for Sessions Modal
  const [selectedPlayer, setSelectedPlayer] = useState<HabitantHistoryRecord | null>(null);
  const [playerSessions, setPlayerSessions] = useState<HabitantSessionRecord[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const info = await getSqliteInfo();
      setSqliteInfo(info);

      const records = await fetchHabitantHistory();
      setHistoryRecords(records);
    } catch (err) {
      setHistoryRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [loadData]);

  const handleInspectPlayer = async (player: HabitantHistoryRecord) => {
    setSelectedPlayer(player);
    setIsLoadingSessions(true);
    try {
      const sessions = await fetchPlayerSessions(player.playerId);
      setPlayerSessions(sessions);
    } catch (err) {
      setPlayerSessions([]);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'name' ? 'asc' : 'desc');
    }
  };

  const filteredAndSortedRecords = useMemo(() => {
    return historyRecords
      .filter((r) => {
        const matchesSearch =
          (r.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.accountName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.userId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.playerId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.lastIp || '').toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        if (statusFilter === 'online') return r.isOnline;
        if (statusFilter === 'offline') return !r.isOnline;

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
  }, [historyRecords, searchQuery, statusFilter, sortField, sortDir]);

  const totalServerPlaytimeSecs = useMemo(() => {
    return historyRecords.reduce((acc, curr) => acc + (curr.totalPlaytimeSeconds || 0), 0);
  }, [historyRecords]);

  return (
    <div className="space-y-4 pt-4 border-t border-slate-800">
      {/* Section Title & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Habitant History</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                Embedded SQLite (Auto)
              </span>
            </div>
            <p className="text-xs text-slate-400">Zero-config automatic player activity & session storage</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsInfoModalOpen(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 rounded text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
          >
            <Info className="w-3.5 h-3.5" /> Storage Info
          </button>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold text-teal-400">Total Recorded Players</span>
            <Users className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {sqliteInfo?.recordedPlayersCount ?? historyRecords.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Stored in embedded SQLite</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold text-emerald-400">Currently Online</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {sqliteInfo?.onlinePlayersCount ?? historyRecords.filter(r => r.isOnline).length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Active server habitants</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold text-cyan-400">Total Server Playtime</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-base font-bold font-mono text-cyan-300 truncate">
            {formatUptime(sqliteInfo?.totalPlaytimeSeconds || totalServerPlaytimeSecs)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Accumulated across all players</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold text-purple-400">SQLite Database File</span>
            <HardDrive className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-base font-bold text-white font-mono truncate">
            {sqliteInfo ? formatBytes(sqliteInfo.fileSizeBytes) : 'Active'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Statically bundled SQLite</div>
        </div>
      </div>

      {/* Control Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-teal-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter habitant history by name, Steam ID, or IP..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none font-mono"
          />
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="text-teal-400 font-bold text-[10px] uppercase">Status Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-white rounded px-2 py-1 text-xs focus:outline-none"
            >
              <option value="all">All Records ({historyRecords.length})</option>
              <option value="online">Online Now</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-teal-400" />
            <h4 className="text-xs font-bold text-teal-400 uppercase tracking-widest">Habitant Player History Archive</h4>
          </div>
          <span className="text-[10px] text-slate-400">Total {filteredAndSortedRecords.length} records matching filter</span>
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
                    Habitant Name
                    {sortField === 'name' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />)}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('maxLevel')}
                  className="px-4 py-2 font-medium cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center gap-1">
                    Max / Last Lvl
                    {sortField === 'maxLevel' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />)}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('isOnline')}
                  className="px-4 py-2 font-medium cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center gap-1">
                    Status
                    {sortField === 'isOnline' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />)}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('totalPlaytimeSeconds')}
                  className="px-4 py-2 font-medium cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center gap-1">
                    Total Playtime
                    {sortField === 'totalPlaytimeSeconds' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />)}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('firstSeen')}
                  className="px-4 py-2 font-medium cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center gap-1">
                    First Seen
                    {sortField === 'firstSeen' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />)}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('lastSeen')}
                  className="px-4 py-2 font-medium cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center gap-1">
                    Last Seen
                    {sortField === 'lastSeen' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />)}
                  </div>
                </th>

                <th className="px-4 py-2 font-medium">Last IP</th>

                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredAndSortedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-xs">
                    No habitant history records stored yet. Active players will be recorded automatically.
                  </td>
                </tr>
              ) : (
                filteredAndSortedRecords.map((r, idx) => (
                  <tr key={r.playerId || idx} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-medium text-white flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-slate-800 text-cyan-400 font-bold text-[10px] flex items-center justify-center border border-teal-500/30 shrink-0">
                        {(r.name || 'P').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold truncate max-w-[160px]">{r.name || 'Unknown'}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]">
                          {r.accountName || r.userId || r.playerId}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono">
                      <span className="font-bold text-white">Lvl {r.maxLevel}</span>
                      {r.lastLevel !== r.maxLevel && (
                        <span className="text-[10px] text-slate-400 ml-1">(Last: {r.lastLevel})</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {r.isOnline ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          ONLINE NOW
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          OFFLINE
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 font-mono font-bold text-cyan-300">
                      {formatUptime(r.totalPlaytimeSeconds)}
                    </td>

                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                      {formatDate(r.firstSeen)}
                    </td>

                    <td className="px-4 py-3 font-mono text-[11px] text-slate-300">
                      {formatDate(r.lastSeen)}
                    </td>

                    <td className="px-4 py-3 font-mono text-[11px] opacity-70">
                      {r.lastIp || '127.0.0.1'}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleInspectPlayer(r)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-cyan-400 hover:text-slate-950 text-cyan-400 rounded text-[10px] font-bold uppercase transition cursor-pointer"
                      >
                        Inspect History
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Storage Info Modal */}
      {isInfoModalOpen && sqliteInfo && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
                <Database className="w-4 h-4" />
                <span>Embedded SQLite Database Info</span>
              </div>
              <button onClick={() => setIsInfoModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1">
                <div className="text-[10px] text-teal-400 font-bold uppercase flex items-center gap-1">
                  <Folder className="w-3.5 h-3.5" /> Database File Location
                </div>
                <div className="font-mono text-white text-[11px] break-all selection:bg-cyan-500/30 p-1.5 bg-slate-900 rounded border border-slate-800/80">
                  {sqliteInfo.dbPath}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-400">File Size</div>
                  <div className="text-white font-bold text-sm">{formatBytes(sqliteInfo.fileSizeBytes)}</div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-400">Total Records</div>
                  <div className="text-cyan-400 font-bold text-sm">{sqliteInfo.recordedPlayersCount} Players</div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Habitant History runs completely self-contained within your Palworld Server Monitor desktop app using an embedded SQLite database. All player activity, levels, base structures, and session timelines are saved automatically to this local database file.
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsInfoModalOpen(false)}
                className="px-4 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded text-xs uppercase transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player Session Detail Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl text-slate-200">
            <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-xs text-white uppercase tracking-wider">
                  Session History: {selectedPlayer.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 bg-slate-950 rounded border border-slate-800">
                  <div className="text-[10px] text-teal-400">Total Playtime</div>
                  <div className="text-white font-bold text-sm">{formatUptime(selectedPlayer.totalPlaytimeSeconds)}</div>
                </div>

                <div className="p-3 bg-slate-950 rounded border border-slate-800">
                  <div className="text-[10px] text-teal-400">Highest Level</div>
                  <div className="text-emerald-400 font-bold text-sm">Level {selectedPlayer.maxLevel}</div>
                </div>

                <div className="p-3 bg-slate-950 rounded border border-slate-800">
                  <div className="text-[10px] text-teal-400">Base Structures</div>
                  <div className="text-cyan-400 font-bold text-sm">{selectedPlayer.buildingCount} Items</div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Historical Game Sessions</h4>
                {isLoadingSessions ? (
                  <div className="p-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Loading session records...
                  </div>
                ) : playerSessions.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs bg-slate-950 rounded border border-slate-800">
                    No individual session logs recorded for this player yet.
                  </div>
                ) : (
                  <div className="bg-slate-950 rounded border border-slate-800 overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-900 text-teal-400 text-[11px] border-b border-slate-800">
                        <tr>
                          <th className="px-3 py-2">Joined Server</th>
                          <th className="px-3 py-2">Left Server</th>
                          <th className="px-3 py-2">Session Duration</th>
                          <th className="px-3 py-2">Final Level</th>
                          <th className="px-3 py-2">IP Address</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                        {playerSessions.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-900/40">
                            <td className="px-3 py-2 text-[11px] text-slate-200">{formatDate(s.joinedAt)}</td>
                            <td className="px-3 py-2 text-[11px] text-slate-400">
                              {s.leftAt ? formatDate(s.leftAt) : <span className="text-emerald-400 font-bold">Active Now</span>}
                            </td>
                            <td className="px-3 py-2 text-cyan-300 font-bold">{formatUptime(s.sessionSeconds)}</td>
                            <td className="px-3 py-2 text-white">Lvl {s.finalLevel}</td>
                            <td className="px-3 py-2 text-[11px] text-slate-400">{s.ip || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 text-right">
              <button
                onClick={() => setSelectedPlayer(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-cyan-400 hover:text-slate-950 text-white rounded text-xs uppercase font-bold transition cursor-pointer"
              >
                Close History Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
