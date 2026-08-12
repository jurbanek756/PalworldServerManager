import React, { useState } from 'react';
import { Server, Lock, Eye, EyeOff, ShieldCheck, AlertTriangle, CheckCircle2, RefreshCw, X, Zap } from 'lucide-react';
import { connect, parseError } from '../api';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentServerUrl: string;
  currentUsername: string;
  onConnectSuccess: () => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onClose,
  currentServerUrl,
  currentUsername,
  onConnectSuccess,
}) => {
  const [serverUrl, setServerUrl] = useState(currentServerUrl || 'http://localhost:8212');
  const [username, setUsername] = useState(currentUsername || 'admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isValidating, setIsValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyPreset = (url: string) => {
    setServerUrl(url);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleTestAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidating(true);
    setErrorMsg(null);
    setErrorDetail(null);
    setSuccessMsg(null);

    try {
      const snapshot = await connect(serverUrl, username, password);
      setSuccessMsg(`Connected successfully! Target: '${snapshot.info.servername || 'Palworld Server'}'.`);
      
      setTimeout(() => {
        onConnectSuccess();
        onClose();
      }, 600);
    } catch (err: any) {
      const parsed = parseError(typeof err === 'string' ? err : err?.message || 'Connection failed');
      setErrorMsg(`${parsed.title}: ${parsed.message}`);
      setErrorDetail(parsed.detail || null);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden text-slate-200">
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-slate-800 border border-teal-500/30 flex items-center justify-center text-cyan-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">Palworld Server Connection</h3>
              <p className="text-xs text-slate-400">Configure REST API Endpoint & Credentials</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleTestAndConnect} className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-teal-400 uppercase tracking-wider mb-1.5 block">
              Quick Endpoint Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset('http://localhost:8212')}
                className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 rounded border border-slate-800 text-left text-xs transition cursor-pointer"
              >
                <div className="font-medium text-white">Local 8212</div>
                <div className="text-[10px] text-slate-400 truncate font-mono">localhost:8212</div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('http://127.0.0.1:8281')}
                className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 rounded border border-slate-800 text-left text-xs transition cursor-pointer"
              >
                <div className="font-medium text-white">Local 8281</div>
                <div className="text-[10px] text-slate-400 truncate font-mono">127.0.0.1:8281</div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('http://192.168.1.100:8212')}
                className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 rounded border border-slate-800 text-left text-xs transition cursor-pointer"
              >
                <div className="font-medium text-white">LAN Host</div>
                <div className="text-[10px] text-slate-400 truncate font-mono">192.168.1.100:8212</div>
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-teal-400 uppercase tracking-wider mb-1 block">
              Server REST API Endpoint URL
            </label>
            <div className="relative">
              <Server className="w-4 h-4 text-teal-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://localhost:8212"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded pl-9 pr-3 py-2 text-xs text-white font-mono focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Must match RESTAPIPort in PalWorldSettings.ini (Default: 8212)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-teal-400 uppercase tracking-wider mb-1 block">REST Username</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-teal-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded pl-9 pr-3 py-2 text-xs text-white font-mono focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-teal-400 uppercase tracking-wider mb-1 block">Admin Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded pl-3 pr-9 py-2 text-xs text-white font-mono focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded border border-slate-800 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300">
              <span className="font-bold text-cyan-400 block">Windows Credential Manager Active</span>
              Credentials are securely written to Windows Credential Vault via Rust <code className="text-teal-400 font-mono text-[10px]">keyring</code> crate.
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded text-rose-200 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1 w-full overflow-hidden">
                <div className="font-bold">{errorMsg}</div>
                {errorDetail && (
                  <div className="mt-1 p-2 bg-slate-950 border border-rose-900/60 rounded font-mono text-[11px] text-rose-300 overflow-x-auto max-w-full">
                    <code>{errorDetail}</code>
                  </div>
                )}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>{successMsg}</div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs uppercase font-bold transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isValidating}
              className="px-5 py-2 bg-cyan-400 text-slate-950 font-bold uppercase text-xs tracking-wider rounded transition flex items-center gap-2 disabled:opacity-50 hover:bg-white cursor-pointer shadow-[0_0_12px_rgba(34,211,238,0.3)]"
            >
              {isValidating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Validate & Connect
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
