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
import { PaldexTab } from './components/PaldexTab';
import { DiagnosticsTab } from './components/DiagnosticsTab';
import { BroadcastModal } from './components/BroadcastModal';
import { ServerControlsModal } from './components/ServerControlsModal';
import { BanListModal } from './components/BanListModal';
import { TelemetryPoint } from './components/TelemetrySparkline';

import './index.css';

type TelemetryState = {
  status: ConnectionStatus;
  telemetryHistory: TelemetryPoint[];
  lastRefreshType: 'manual' | 'auto' | null;
  snapshot: Snapshot | null;
  lastRefreshedAt: string | null;
  errorDetails: ConnectionError | null;
};

type TelemetryAction = 
  | { type: 'APPLY_SNAPSHOT'; payload: { snap: Snapshot; isAuto: boolean; time: string; point: TelemetryPoint } }
  | { type: 'SET_ERROR'; payload: { error: ConnectionError; status: ConnectionStatus } }
  | { type: 'SET_STATUS'; payload: ConnectionStatus }
  | { type: 'CLEAR_ERROR' };

function telemetryReducer(state: TelemetryState, action: TelemetryAction): TelemetryState {
  switch (action.type) {
    case 'APPLY_SNAPSHOT':
      return {
        ...state,
        snapshot: action.payload.snap,
        status: 'connected',
        errorDetails: null,
        lastRefreshedAt: action.payload.time,
        telemetryHistory: [...state.telemetryHistory, action.payload.point].slice(-50),
        lastRefreshType: action.payload.isAuto ? 'auto' : 'manual'
      };
    case 'SET_ERROR':
      return {
        ...state,
        errorDetails: action.payload.error,
        status: action.payload.status
      };
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, errorDetails: null };
    default:
      return state;
  }
}

export default function App() {
  const [savedConfig, setSavedConfig] = useState<ConnectionConfig | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Administration Modals
  const [isBroadcastOpen, setIsBroadcastOpen] = useState<boolean>(false);
  const [isServerControlsOpen, setIsServerControlsOpen] = useState<boolean>(false);
  const [isBanListOpen, setIsBanListOpen] = useState<boolean>(false);

  const [telemetry, dispatch] = React.useReducer(telemetryReducer, {
    status: 'idle',
    telemetryHistory: [],
    lastRefreshType: null,
    snapshot: null,
    lastRefreshedAt: null,
    errorDetails: null,
  });

  const { status, telemetryHistory, lastRefreshType, snapshot, lastRefreshedAt, errorDetails } = telemetry;

  const applySnapshot = useCallback((snap: Snapshot, isAuto: boolean) => {
    const formattedTime = new Date(snap.refreshedAt).toLocaleTimeString();
    const newPoint: TelemetryPoint = {
      timestamp: formattedTime,
      fps: snap.metrics.serverfps,
      frameTime: snap.metrics.serverframetime,
      playerCount: snap.metrics.currentplayernum,
    };
    dispatch({ type: 'APPLY_SNAPSHOT', payload: { snap, isAuto, time: formattedTime, point: newPoint } });
  }, []);

  // Refresh handler using native Rust backend API
  const handleRefresh = useCallback(async (isAuto: boolean = false) => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    if (!isAuto) dispatch({ type: 'SET_STATUS', payload: 'connecting' });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      const snap = await refresh();
      applySnapshot(snap, isAuto);
    } catch (err: unknown) {
      const parsed = parseError(err instanceof Error ? err.message : String(err));
      let newStatus: ConnectionStatus = 'server_unavailable';
      if (parsed.code === 'AUTH_FAILED') newStatus = 'auth_failed';
      else if (parsed.code === 'MALFORMED_RESPONSE') newStatus = 'malformed_response';
      dispatch({ type: 'SET_ERROR', payload: { error: parsed, status: newStatus } });
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, applySnapshot]);

  // Event-driven listener setup for Rust background monitor updates
  useEffect(() => {
    let unmounted = false;
    let unsubUpdate: (() => void) | null = null;
    let unsubError: (() => void) | null = null;

    onTelemetryUpdate((snap: Snapshot) => {
      if (!unmounted) applySnapshot(snap, true);
    }).then((fn: () => void) => { 
      if (unmounted) fn();
      else unsubUpdate = fn; 
    }).catch(() => {});

    onTelemetryError((errStr: string) => {
      if (unmounted) return;
      const parsed = parseError(errStr);
      let newStatus: ConnectionStatus = 'server_unavailable';
      if (parsed.code === 'AUTH_FAILED') newStatus = 'auth_failed';
      else if (parsed.code === 'MALFORMED_RESPONSE') newStatus = 'malformed_response';
      dispatch({ type: 'SET_ERROR', payload: { error: parsed, status: newStatus } });
    }).then((fn: () => void) => { 
      if (unmounted) fn();
      else unsubError = fn; 
    }).catch(() => {});

    return () => {
      unmounted = true;
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
        onDismiss={() => dispatch({ type: 'CLEAR_ERROR' })}
      />

      {/* Main Tabbed View Container */}
      <main className="flex-1 p-6 w-full overflow-y-auto min-h-0">
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

        {activeTab === 'paldex' && (
          <PaldexTab />
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
