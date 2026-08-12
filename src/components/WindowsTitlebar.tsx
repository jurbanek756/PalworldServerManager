import React from 'react';
import { Server, RefreshCw, Key, AlertTriangle, SlidersHorizontal, Terminal, Zap, Minus, Square, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ConnectionStatus } from '../types';

interface WindowsTitlebarProps {
  status: ConnectionStatus;
  serverUrl: string;
  storedInWinCred: boolean;
  onOpenSettings: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const WindowsTitlebar: React.FC<WindowsTitlebarProps> = ({
  status,
  serverUrl,
  storedInWinCred,
  onOpenSettings,
  activeTab,
  setActiveTab,
}) => {
  const handleMinimize = async () => {
    try {
      await getCurrentWindow().minimize();
    } catch (e) {
      console.log("Window operation fallback", e);
    }
  };

  const handleMaximize = async () => {
    try {
      await getCurrentWindow().toggleMaximize();
    } catch (e) {
      console.log("Window operation fallback", e);
    }
  };

  const handleClose = async () => {
    try {
      await getCurrentWindow().close();
    } catch (e) {
      console.log("Window operation fallback", e);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Connected
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-950/60 text-amber-300 border border-amber-500/30">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Connecting
          </span>
        );
      case 'auth_failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-rose-950/60 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3 h-3" />
            Auth Failed
          </span>
        );
      case 'server_unavailable':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-red-950/60 text-red-400 border border-red-500/30">
            <AlertTriangle className="w-3 h-3" />
            Unreachable
          </span>
        );
      case 'malformed_response':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-purple-950/60 text-purple-400 border border-purple-500/30">
            <AlertTriangle className="w-3 h-3" />
            Bad Payload
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-slate-800 text-slate-400 border border-slate-700">
            Disconnected
          </span>
        );
    }
  };

  return (
    <header className="bg-slate-950 border-b border-slate-800 text-slate-200 select-none sticky top-0 z-40">
      {/* Windows Frame Top Bar */}
      <div data-tauri-drag-region className="flex items-center justify-between px-4 py-1.5 bg-slate-900/90 text-xs border-b border-cyan-500/20">
        <div className="flex items-center gap-2 pointer-events-none">
          <div className="w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.6)]"></div>
          <span className="font-semibold tracking-wider uppercase opacity-90 text-xs text-white">
            Palworld Server Monitor
          </span>

          {storedInWinCred && (
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              <Key className="w-3 h-3 text-cyan-400" />
              Windows Vault Active
            </span>
          )}
        </div>

        {/* Windows Window Controls */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="hidden sm:flex items-center gap-2 border-r border-slate-800 pr-4 text-[11px]">
            <span className="text-slate-400">Endpoint:</span>
            <code className="text-cyan-300 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
              {serverUrl || 'http://localhost:8212'}
            </code>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleMinimize}
              className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
              title="Minimize"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
              title="Maximize"
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-rose-600 rounded text-slate-300 hover:text-white transition"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-2.5 bg-slate-950">
        <nav className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-slate-800 text-white border-l-2 border-cyan-400 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('players')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              activeTab === 'players'
                ? 'bg-slate-800 text-white border-l-2 border-cyan-400 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            Player Registry
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-slate-800 text-white border-l-2 border-cyan-400 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-teal-400" />
            Server Settings
          </button>

          <button
            onClick={() => setActiveTab('gamedata')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              activeTab === 'gamedata'
                ? 'bg-slate-800 text-white border-l-2 border-cyan-400 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            Pal & World Explorer
          </button>

          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              activeTab === 'diagnostics'
                ? 'bg-slate-800 text-white border-l-2 border-cyan-400 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-teal-400" />
            Diagnostics & Logs
          </button>
        </nav>

        <div className="flex items-center gap-3">
          {getStatusBadge()}

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-cyan-400 rounded text-xs font-semibold border border-cyan-500/30 transition cursor-pointer"
          >
            <Key className="w-3.5 h-3.5" />
            Connection Settings
          </button>
        </div>
      </div>
    </header>
  );
};
