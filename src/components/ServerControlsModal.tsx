import React, { useState } from 'react';
import { Save, Power, ShieldAlert, X, Check, AlertTriangle, Clock, Radio, Play } from 'lucide-react';
import { saveWorld, shutdownServer, stopServer, parseError } from '../api';

interface ServerControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverName?: string;
}

export const ServerControlsModal: React.FC<ServerControlsModalProps> = ({
  isOpen,
  onClose,
  serverName = 'UrbanekWorld',
}) => {
  const [activeTab, setActiveTab] = useState<'save' | 'shutdown' | 'stop'>('save');
  
  // Save State
  const [isSaving, setIsSaving] = useState(false);
  
  // Shutdown State
  const [waitTime, setWaitTime] = useState<number>(60);
  const [shutdownMessage, setShutdownMessage] = useState('Server is shutting down shortly. Please log out safely!');
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  
  // Stop State
  const [confirmStop, setConfirmStop] = useState('');
  const [isStopping, setIsStopping] = useState(false);

  // Status feedback
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSaveWorld = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      await saveWorld();
      setStatusMessage({ type: 'success', text: 'World state successfully saved to server disk!' });
    } catch (err: any) {
      const parsed = parseError(typeof err === 'string' ? err : err?.message || 'Failed to save world state.');
      setStatusMessage({ type: 'error', text: `${parsed.title}: ${parsed.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGracefulShutdown = async () => {
    setIsShuttingDown(true);
    setStatusMessage(null);
    try {
      // Attempt auto save world first, but don't let a save error block the shutdown signal
      try {
        await saveWorld();
      } catch (saveErr) {
        console.warn("Pre-shutdown world save failed, proceeding with shutdown signal:", saveErr);
      }
      // Execute shutdown
      await shutdownServer(waitTime, shutdownMessage);
      setStatusMessage({ 
        type: 'success', 
        text: `Graceful shutdown initiated with ${waitTime}s timer! Broadcast message sent.` 
      });
    } catch (err: any) {
      const parsed = parseError(typeof err === 'string' ? err : err?.message || 'Failed to initiate server shutdown.');
      setStatusMessage({ type: 'error', text: `${parsed.title}: ${parsed.message}` });
    } finally {
      setIsShuttingDown(false);
    }
  };


  const handleForceStop = async () => {
    if (confirmStop !== 'STOP') return;

    setIsStopping(true);
    setStatusMessage(null);
    try {
      await stopServer();
      setStatusMessage({ type: 'success', text: 'Emergency server stop signal issued!' });
    } catch (err: any) {
      const parsed = parseError(typeof err === 'string' ? err : err?.message || 'Failed to execute emergency stop.');
      setStatusMessage({ type: 'error', text: `${parsed.title}: ${parsed.message}` });
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Power className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">World State & Server Controls</h2>
              <p className="text-xs text-slate-400 font-mono">Manage saves, graceful shutdowns, and emergency stop signals</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => { setActiveTab('save'); setStatusMessage(null); }}
            className={`py-2 px-3 rounded-md font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'save'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Save className="w-3.5 h-3.5" /> Save World
          </button>

          <button
            onClick={() => { setActiveTab('shutdown'); setStatusMessage(null); }}
            className={`py-2 px-3 rounded-md font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'shutdown'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Shutdown
          </button>

          <button
            onClick={() => { setActiveTab('stop'); setStatusMessage(null); }}
            className={`py-2 px-3 rounded-md font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'stop'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Force Stop
          </button>
        </div>

        {/* Tab 1: Save World */}
        {activeTab === 'save' && (
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2 text-xs text-slate-300">
              <span className="font-bold text-emerald-400 block">Immediate World Save</span>
              <p>
                Triggers an instant save operation on your Palworld dedicated server. Players, base camp structures, Pal inventories, and world states will be safely flushed to disk.
              </p>
            </div>

            <button
              disabled={isSaving}
              onClick={handleSaveWorld}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold uppercase tracking-wider text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Save className={`w-4 h-4 ${isSaving ? 'animate-bounce' : ''}`} />
              <span>{isSaving ? 'Saving World to Disk...' : 'Execute Instant World Save'}</span>
            </button>
          </div>
        )}

        {/* Tab 2: Timed Graceful Shutdown */}
        {activeTab === 'shutdown' && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
                  Shutdown Countdown Timer (Seconds)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 60, 300].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setWaitTime(t)}
                      className={`py-1.5 rounded text-xs font-mono font-bold transition border cursor-pointer ${
                        waitTime === t
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {t >= 60 ? `${t / 60}m` : `${t}s`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
                  In-Game Player Warning Message
                </label>
                <input
                  type="text"
                  value={shutdownMessage}
                  onChange={(e) => setShutdownMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded border border-amber-500/30 text-[11px] text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Graceful shutdown automatically triggers a world save prior to notifying players and shutting down the server process after {waitTime} seconds.
              </span>
            </div>

            <button
              disabled={isShuttingDown}
              onClick={handleGracefulShutdown}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold uppercase tracking-wider text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <Power className={`w-4 h-4 ${isShuttingDown ? 'animate-spin' : ''}`} />
              <span>{isShuttingDown ? 'Initiating Shutdown...' : `Initiate ${waitTime}s Graceful Shutdown`}</span>
            </button>
          </div>
        )}

        {/* Tab 3: Emergency Force Stop */}
        {activeTab === 'stop' && (
          <div className="space-y-4">
            <div className="bg-rose-950/40 p-4 rounded-lg border border-rose-500/40 text-xs space-y-2 text-rose-200">
              <div className="flex items-center gap-2 font-bold text-rose-400">
                <ShieldAlert className="w-4 h-4" /> Emergency Force Stop Confirmation
              </div>
              <p>
                Sends an immediate terminate signal (<code className="text-white font-mono">POST /v1/api/stop</code>) to the server. Use this only if the server is frozen or un-responsive.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
                Type <code className="text-rose-400 font-mono">STOP</code> to confirm:
              </label>
              <input
                type="text"
                value={confirmStop}
                onChange={(e) => setConfirmStop(e.target.value)}
                placeholder="Type STOP"
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-400 rounded-lg p-2.5 text-xs text-white focus:outline-none font-mono"
              />
            </div>

            <button
              disabled={isStopping || confirmStop !== 'STOP'}
              onClick={handleForceStop}
              className="w-full py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold uppercase tracking-wider text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{isStopping ? 'Stopping Server...' : 'Issue Emergency Force Stop'}</span>
            </button>
          </div>
        )}

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
