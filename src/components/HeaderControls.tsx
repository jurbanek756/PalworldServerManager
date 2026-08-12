import React from 'react';
import { RefreshCw, Clock, Info } from 'lucide-react';
import { ConnectionStatus } from '../types';

interface HeaderControlsProps {
  status: ConnectionStatus;
  lastRefreshedAt: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  serverName?: string;
  serverVersion?: string;
  lastRefreshType: 'manual' | 'auto' | null;
}

export const HeaderControls: React.FC<HeaderControlsProps> = ({
  lastRefreshedAt,
  onRefresh,
  isRefreshing,
  serverName,
  serverVersion,
  lastRefreshType,
}) => {
  return (
    <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
      {/* Server Identifier & Subtitle */}
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.5)]"></div>
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2 tracking-tight">
            {serverName || "Palworld Dedicated Server"}
          </h2>
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3 h-3 text-cyan-400" />
            <span>Version {serverVersion || 'v0.3.x'} • Native WinCred Vault Protected</span>
          </p>
        </div>
      </div>

      {/* Snapshot Indicators & Icon Refresh Button */}
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <div className="text-[10px] text-teal-400 uppercase tracking-wider font-semibold flex items-center justify-end gap-1">
            <span>Last Snapshot</span>
            {lastRefreshType && (
              <span className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold uppercase ${
                lastRefreshType === 'auto' 
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {lastRefreshType}
              </span>
            )}
          </div>
          <div className="text-xs font-mono text-slate-200 flex items-center justify-end gap-1 mt-0.5">
            <Clock className="w-3 h-3 text-teal-400" />
            {lastRefreshedAt ? lastRefreshedAt : 'Not refreshed yet'}
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh Data"
          aria-label="Refresh Data"
          className="bg-cyan-400 text-slate-950 p-2.5 rounded-lg hover:bg-white transition-all active:translate-y-0.5 shadow-[0_4px_14px_rgba(34,211,238,0.25)] flex items-center justify-center disabled:opacity-50 cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};
