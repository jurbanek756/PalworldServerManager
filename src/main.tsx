import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  ConnectionStatus, 
  ConnectionError, 
  Snapshot,
  ConnectionConfig
} from './types';
import { 
  getSavedConnection, 
  refresh, 
  parseError, 
  onTelemetryUpdate, 
  onTelemetryError 
} from './api';

import { WindowsTitlebar } from './components/WindowsTitlebar';
import { ConnectionModal } from './components/ConnectionModal';
import { HeaderControls } from './components/HeaderControls';
import { StatusBanner } from './components/StatusBanner';
import { OverviewTab } from './components/OverviewTab';
import { PlayersTab } from './components/PlayersTab';
import { SettingsTab } from './components/SettingsTab';
import { GameDataTab } from './components/GameDataTab';
import { DiagnosticsTab } from './components/DiagnosticsTab';
import { BroadcastModal } from './components/BroadcastModal';
import { ServerControlsModal } from './components/ServerControlsModal';
import { BanListModal } from './components/BanListModal';
import { TelemetryPoint } from './components/TelemetrySparkline';

import './index.css';

export default function App() {
  const [savedConfig, setSavedConfig] = useState<ConnectionConfig | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Administration Modals
  const [isBroadcastOpen, setIsBroadcastOpen] = useState<boolean>(false);
  const [isServerControlsOpen, setIsServerControlsOpen] = useState<boolean>(false);
  const [isBanListOpen, setIsBanListOpen] = useState<boolean>(false);

  // Telemetry History Ring Buffer (up to 50 points)
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>([]);

  // Snapshot States
  const [lastRefreshType, setLastRefreshType] = useState<'manual' | 'auto' | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ConnectionError | null>(null);

  const applySnapshot = useCallback((snap: Snapshot, isAuto: boolean) => {
    setSnapshot(snap);
    setStatus('connected');
    setErrorDetails(null);
    
    const formattedTime = new Date(snap.refreshedAt).toLocaleTimeString();

    setLastRefreshedAt(formattedTime);

    const newPoint: TelemetryPoint = {
      timestamp: formattedTime,
      fps: snap.metrics.serverfps,
      frameTime: snap.metrics.serverframetime,
      playerCount: snap.metrics.currentplayernum,
    };

    setTelemetryHistory((prev) => [...prev, newPoint].slice(-50));

    if (isAuto) {
      setLastRefreshType('auto');
    } else {
      setLastRefreshType('manual');
    }
  }, []);

  // Refresh handler using native Rust backend API
  const handleRefresh = useCallback(async (isAuto: boolean = false) => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    if (!isAuto) setStatus('connecting');
    setErrorDetails(null);

    try {
      const snap = await refresh();
      applySnapshot(snap, isAuto);
    } catch (err: any) {
      const parsed = parseError(typeof err === 'string' ? err : err?.message || 'Failed to refresh server data');
      setErrorDetails(parsed);

      if (parsed.code === 'AUTH_FAILED') setStatus('auth_failed');
      else if (parsed.code === 'MALFORMED_RESPONSE') setStatus('malformed_response');
      else setStatus('server_unavailable');
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, applySnapshot]);

  // Event-driven listener setup for Rust background monitor updates
  useEffect(() => {
    let unsubUpdate: (() => void) | null = null;
    let unsubError: (() => void) | null = null;

    onTelemetryUpdate((snap: Snapshot) => {
      applySnapshot(snap, true);
    }).then((fn: () => void) => { unsubUpdate = fn; }).catch(() => {});

    onTelemetryError((errStr: string) => {
      const parsed = parseError(errStr);
      setErrorDetails(parsed);
      if (parsed.code === 'AUTH_FAILED') setStatus('auth_failed');
      else if (parsed.code === 'MALFORMED_RESPONSE') setStatus('malformed_response');
      else setStatus('server_unavailable');
    }).then((fn: () => void) => { unsubError = fn; }).catch(() => {});

    return () => {
      if (unsubUpdate) unsubUpdate();
      if (unsubError) unsubError();
    };
  }, [applySnapshot]);

  // Boot initialization: load saved connection from Windows Vault
  useEffect(() => {
    getSavedConnection()
      .then((cfg) => {
        if (cfg) {
          setSavedConfig(cfg);
          handleRefresh(false);
        } else {
          setIsModalOpen(true);
        }
      })
      .catch(() => {
        setIsModalOpen(true);
      });
  }, []);

  const handleConnectSuccess = () => {
    getSavedConnection().then((cfg) => {
      if (cfg) setSavedConfig(cfg);
    });
    handleRefresh(false);
  };

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Navigation Titlebar */}
      <WindowsTitlebar
        status={status}
        onOpenSettings={() => setIsModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Header Controls */}
      <HeaderControls
        status={status}
        lastRefreshedAt={lastRefreshedAt}
        onRefresh={() => handleRefresh(false)}
        isRefreshing={isRefreshing}
        serverName={snapshot?.info.servername}
        serverVersion={snapshot?.info.version}
        lastRefreshType={lastRefreshType}
      />

      {/* Status / Diagnostic Error Alert Banner */}
      <StatusBanner
        error={errorDetails}
        onOpenSettings={() => setIsModalOpen(true)}
        onRefresh={() => handleRefresh(false)}
        onDismiss={() => setErrorDetails(null)}
      />

      {/* Main Tabbed View Container */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto overflow-y-auto min-h-0">
        {activeTab === 'overview' && (
          <OverviewTab
            info={snapshot?.info || null}
            metrics={snapshot?.metrics || null}
            settings={snapshot?.settings || null}
            isLoading={isRefreshing && !snapshot}
            onRefresh={() => handleRefresh(false)}
            telemetryHistory={telemetryHistory}
            onOpenBroadcast={() => setIsBroadcastOpen(true)}
            onOpenServerControls={() => setIsServerControlsOpen(true)}
            onOpenBanList={() => setIsBanListOpen(true)}
          />
        )}

        {activeTab === 'players' && (
          <PlayersTab
            players={snapshot?.players || []}
            isLoading={isRefreshing}
            onRefresh={() => handleRefresh(false)}
            onOpenBanList={() => setIsBanListOpen(true)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            settings={snapshot?.settings || null}
            isLoading={isRefreshing}
            onRefresh={() => handleRefresh(false)}
          />
        )}

        {activeTab === 'gamedata' && (
          <GameDataTab
            gameData={snapshot?.gameData || null}
            isLoading={isRefreshing}
            onRefresh={() => handleRefresh(false)}
          />
        )}

        {activeTab === 'diagnostics' && (
          <DiagnosticsTab
            info={snapshot?.info || null}
            metrics={snapshot?.metrics || null}
            players={snapshot?.players || []}
            settings={snapshot?.settings || null}
            serverUrl={savedConfig?.endpoint || 'http://localhost:8212'}
            username={savedConfig?.username || 'admin'}
            onRefresh={() => handleRefresh(false)}
          />
        )}
      </main>

      {/* Connection & Auth Modal */}
      <ConnectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentServerUrl={savedConfig?.endpoint || 'http://localhost:8212'}
        currentUsername={savedConfig?.username || 'admin'}
        onConnectSuccess={handleConnectSuccess}
      />

      {/* Broadcast Modal */}
      <BroadcastModal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        serverName={snapshot?.info.servername}
      />

      {/* Server Controls Modal */}
      <ServerControlsModal
        isOpen={isServerControlsOpen}
        onClose={() => setIsServerControlsOpen(false)}
        serverName={snapshot?.info.servername}
      />

      {/* Ban List Manager Modal */}
      <BanListModal
        isOpen={isBanListOpen}
        onClose={() => setIsBanListOpen(false)}
      />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
