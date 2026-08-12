import React, { useState, useEffect } from 'react';
import { ShieldAlert, X, RefreshCw, UserX, Check, AlertTriangle, UserCheck, Search } from 'lucide-react';
import { fetchBanList, unbanPlayer, parseError } from '../api';

interface BanListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BanListModal: React.FC<BanListModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [bannedPlayers, setBannedPlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchBannedList = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res: any = await fetchBanList();
      if (Array.isArray(res)) {
        setBannedPlayers(res);
      } else if (res && typeof res === 'object') {
        const list = res.players || res.banlist || Object.values(res);
        setBannedPlayers(Array.isArray(list) ? list : []);
      } else {
        setBannedPlayers([]);
      }
    } catch (err: any) {
      console.warn('Unable to fetch ban list:', err);
      setBannedPlayers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBannedList();
    }
  }, [isOpen]);

  const handleUnban = async (userId: string) => {
    setStatusMessage(null);
    try {
      await unbanPlayer(userId);
      setStatusMessage({ type: 'success', text: `Player ${userId} has been successfully unbanned!` });
      fetchBannedList();
    } catch (err: any) {
      const parsed = parseError(typeof err === 'string' ? err : err?.message || 'Failed to unban player.');
      setStatusMessage({ type: 'error', text: `${parsed.title}: ${parsed.message}` });
    }
  };

  if (!isOpen) return null;

  const filteredBans = bannedPlayers.filter((ban) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const str = typeof ban === 'string' ? ban : JSON.stringify(ban);
    return str.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-rose-500/40 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Ban List Manager</h2>
              <p className="text-xs text-slate-400 font-mono">Inspect banned player accounts and issue instant unban actions</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchBannedList}
              className="p-1.5 bg-slate-950 hover:bg-slate-800 text-cyan-400 rounded-lg transition cursor-pointer"
              title="Refresh Ban List"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter banned user IDs or IP addresses..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-rose-400 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none"
          />
        </div>

        {/* Status Feedback Banner */}
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

        {/* Banned List Body */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
          {filteredBans.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 font-mono">
              {bannedPlayers.length === 0 ? 'No banned accounts recorded on this server.' : 'No banned accounts matched your search.'}
            </div>
          ) : (
            filteredBans.map((ban, idx) => {
              const userId = typeof ban === 'string' ? ban : ban.user_id || ban.userid || ban.ip || JSON.stringify(ban);
              const name = ban.name || ban.account_name || 'Banned Player';

              return (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-slate-900 rounded border border-slate-800/80 hover:border-slate-700 transition text-xs"
                >
                  <div>
                    <span className="font-bold text-white block">{name}</span>
                    <span className="font-mono text-[10px] text-rose-400 block mt-0.5">{userId}</span>
                  </div>

                  <button
                    onClick={() => handleUnban(userId)}
                    className="px-3 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <UserCheck className="w-3.5 h-3.5" /> Unban
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
