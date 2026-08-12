import React, { useState } from 'react';
import { Megaphone, Send, X, AlertTriangle, Check, Sparkles, Clock, Radio } from 'lucide-react';
import { announceMessage, parseError } from '../api';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverName?: string;
}

export const BroadcastModal: React.FC<BroadcastModalProps> = ({
  isOpen,
  onClose,
  serverName = 'UrbanekWorld',
}) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const presets = [
    {
      title: '⚠️ Server Restart Warning (5m)',
      text: 'Server restarting in 5 minutes! Please save your inventory and return to base camp.',
    },
    {
      title: '🎮 Welcome Message',
      text: `Welcome to ${serverName}! Enjoy your adventure and have fun!`,
    },
    {
      title: '⏳ Maintenance Notice',
      text: 'Scheduled server maintenance will begin shortly. Please prepare to log out safely.',
    },
    {
      title: '🏆 World Event / Boss Raid',
      text: 'World event / Boss raid starting soon! Group up at base camp.',
    },
    {
      title: '5m Notice',
      text: 'Server scheduled maintenance starting in 5 minutes.',
    },
  ];

  const handleSend = async (textToSend?: string) => {
    const finalMsg = textToSend || message;
    if (!finalMsg.trim()) return;

    setIsSending(true);
    setStatusMessage(null);

    try {
      await announceMessage(finalMsg.trim());
      setStatusMessage({ type: 'success', text: 'Announcement broadcast successfully to all in-game players!' });
      if (!textToSend) setMessage('');
    } catch (err: any) {
      const parsed = parseError(typeof err === 'string' ? err : err?.message || 'Failed to send broadcast message.');
      setStatusMessage({ type: 'error', text: `${parsed.title}: ${parsed.message}` });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Live In-Game Broadcast Hub</h2>
              <p className="text-xs text-slate-400 font-mono">Send real-time chat announcements to all active players</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Templates */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase text-teal-400 tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Quick Preset Templates
          </span>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {presets.map((preset, idx) => (
              <button
                key={idx}
                disabled={isSending}
                onClick={() => {
                  setMessage(preset.text);
                  handleSend(preset.text);
                }}
                className="p-2.5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 rounded-lg text-left transition group cursor-pointer"
              >
                <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 block truncate">
                  {preset.title}
                </span>
                <span className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 font-mono">
                  {preset.text}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block">
            Custom In-Game Broadcast Message
          </label>
          
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type message to broadcast to live server chat (e.g. Server restart in 10 minutes)..."
            rows={3}
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-lg p-3 text-xs text-white placeholder-slate-600 focus:outline-none font-sans"
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

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            Close
          </button>

          <button
            disabled={isSending || !message.trim()}
            onClick={() => handleSend()}
            className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold uppercase tracking-wider text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
          >
            <Radio className={`w-3.5 h-3.5 ${isSending ? 'animate-pulse' : ''}`} />
            <span>{isSending ? 'Broadcasting...' : 'Broadcast to Game'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
