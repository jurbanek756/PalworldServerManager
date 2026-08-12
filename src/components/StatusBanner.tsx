import React from 'react';
import { AlertTriangle, Key, RefreshCw, X } from 'lucide-react';
import { ConnectionError } from '../types';

interface StatusBannerProps {
  error: ConnectionError | null;
  onOpenSettings: () => void;
  onRefresh: () => void;
  onDismiss: () => void;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  error,
  onOpenSettings,
  onRefresh,
  onDismiss,
}) => {
  if (!error) return null;

  return (
    <div className="bg-slate-900 border-b border-rose-900/80 px-6 py-4 text-slate-200 shadow-lg relative z-30">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded bg-rose-950 border border-rose-600 flex items-center justify-center shrink-0 text-rose-400 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs text-rose-300 uppercase tracking-wider">{error.title}</h3>
              <span className="text-[10px] text-slate-400 font-mono">[{error.timestamp}]</span>
            </div>

            <p className="text-xs text-white font-medium">
              {error.message}
            </p>

            {error.detail && (
              <div className="mt-2 p-2 bg-slate-950 border border-rose-900/60 rounded font-mono text-[11px] text-rose-300 overflow-x-auto max-w-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-sans block mb-0.5">Details:</span>
                <code>{error.detail}</code>
              </div>
            )}

            <div className="pt-2">
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block mb-1">
                Troubleshooting Checklist:
              </span>
              <ul className="text-[11px] text-slate-300 space-y-0.5 list-disc pl-4 font-sans">
                {error.troubleshooting.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={onOpenSettings}
            className="px-3 py-1.5 bg-slate-800 hover:bg-cyan-400 hover:text-slate-950 text-cyan-400 rounded text-xs font-bold uppercase border border-cyan-500/30 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Credentials</span>
          </button>

          <button
            onClick={onRefresh}
            className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-white rounded text-xs font-bold uppercase border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Retry</span>
          </button>

          <button
            onClick={onDismiss}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
            title="Dismiss Alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
