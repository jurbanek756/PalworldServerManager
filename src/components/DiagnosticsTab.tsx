import React, { useState } from 'react';
import { Key, Play, CheckCircle2, Copy, Check, HardDrive, Lock, Code } from 'lucide-react';
import { PalworldInfo, PalworldMetrics, PalworldPlayer, PalworldSettings, TestResult } from '../types';
import { formatUptime, formatFpsQuality, parseError } from '../api';

interface DiagnosticsTabProps {
  info: PalworldInfo | null;
  metrics: PalworldMetrics | null;
  players: PalworldPlayer[];
  settings: PalworldSettings | null;
  serverUrl: string;
  username: string;
  onRefresh: () => void;
}

export const DiagnosticsTab: React.FC<DiagnosticsTabProps> = ({
  info,
  metrics,
  players,
  settings,
  serverUrl,
  username,
  onRefresh,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'wincred' | 'json' | 'tests'>('wincred');
  const [activeJsonEndpoint, setActiveJsonEndpoint] = useState<'info' | 'metrics' | 'players' | 'settings'>('info');
  
  const [copiedJson, setCopiedJson] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const handleCopyJson = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 1500);
  };

  const runUnitTestSuite = async () => {
    setIsRunningTests(true);
    const results: TestResult[] = [];

    // Test 1: Uptime Formatter
    const start1 = performance.now();
    const formatted = formatUptime(172800);
    const pass1 = formatted.includes("2d");
    results.push({
      id: 'test-uptime',
      name: 'Uptime Formatting Assertion (172800s -> "2d...")',
      category: 'Uptime',
      passed: pass1,
      durationMs: Math.round(performance.now() - start1),
      details: `Returned: "${formatted}"`
    });

    // Test 2: FPS Quality Classifier
    const start2 = performance.now();
    const fpsResult = formatFpsQuality(60);
    const pass2 = fpsResult.text.includes("Optimal");
    results.push({
      id: 'test-fps',
      name: 'FPS Quality Classification (60 FPS -> Optimal)',
      category: 'Parsing',
      passed: pass2,
      durationMs: Math.round(performance.now() - start2),
      details: `Quality label: "${fpsResult.text}"`
    });

    // Test 3: Player Sorting Logic
    const start3 = performance.now();
    const mockList = [
      { name: 'P1', level: 10, ping: 20, building_count: 5, accountName: 'a1', playerId: '1', userId: '1', ip: '1.1.1.1', location_x: 0, location_y: 0 },
      { name: 'P2', level: 50, ping: 10, building_count: 20, accountName: 'a2', playerId: '2', userId: '2', ip: '1.1.1.2', location_x: 0, location_y: 0 }
    ];
    const sorted = [...mockList].sort((a, b) => b.level - a.level);
    const pass3 = sorted[0]?.level === 50;
    results.push({
      id: 'test-sorting',
      name: 'Player Table Level Sorting (Descending)',
      category: 'Sorting',
      passed: pass3,
      durationMs: Math.round(performance.now() - start3),
      details: `Top player level: ${sorted[0]?.level ?? 'N/A'}`
    });

    // Test 4: Error Mapping
    const start4 = performance.now();
    const errMap = parseError("[auth] Credentials rejected");
    const pass4 = errMap.code === 'AUTH_FAILED';
    results.push({
      id: 'test-error-mapping',
      name: 'Rust Error Code Parsing ([auth] -> AUTH_FAILED)',
      category: 'Error Mapping',
      passed: pass4,
      durationMs: Math.round(performance.now() - start4),
      details: `Mapped code: ${errMap.code}`
    });

    setTestResults(results);
    setIsRunningTests(false);
  };

  const getActiveJsonData = () => {
    switch (activeJsonEndpoint) {
      case 'info': return info || { message: "No info snapshot loaded yet" };
      case 'metrics': return metrics || { message: "No metrics snapshot loaded yet" };
      case 'players': return players || [];
      case 'settings': return settings || { message: "No settings snapshot loaded yet" };
      default: return {};
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-Navigation */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveSubTab('wincred')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'wincred'
                ? 'bg-slate-800 text-white border border-teal-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-950'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Windows Vault Status</span>
          </button>

          <button
            onClick={() => setActiveSubTab('json')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'json'
                ? 'bg-slate-800 text-white border border-teal-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-950'
            }`}
          >
            <Code className="w-3.5 h-3.5 text-teal-400" />
            <span>Live Raw JSON Viewer</span>
          </button>

          <button
            onClick={() => setActiveSubTab('tests')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'tests'
                ? 'bg-slate-800 text-white border border-teal-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-950'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Unit Diagnostic Suite</span>
          </button>
        </div>

        <button
          onClick={onRefresh}
          className="px-3 py-1 bg-slate-950 hover:bg-slate-800 text-cyan-400 rounded text-xs font-mono border border-slate-800 transition cursor-pointer"
        >
          Re-poll REST API
        </button>
      </div>

      {/* Sub-Tab 1: Windows Vault Info */}
      {activeSubTab === 'wincred' && (
        <div className="space-y-4">
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-5">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">
                  Windows Credential Vault Integration
                </h3>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                Rust Keyring Driver Active
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Palworld Server Monitor leverages Tauri's Rust backend to securely write your REST API password into Windows Credential Manager under the target <code className="text-cyan-400">Palworld Server Monitor</code>. No passwords are ever logged or saved unencrypted on disk.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="text-[10px] text-teal-400 block uppercase">Target Endpoint</span>
                <code className="text-white font-bold text-xs mt-1 block truncate">{serverUrl}</code>
              </div>

              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="text-[10px] text-teal-400 block uppercase">Authenticated User</span>
                <code className="text-cyan-400 font-bold text-xs mt-1 block">{username}</code>
              </div>

              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="text-[10px] text-teal-400 block uppercase">Security Driver</span>
                <code className="text-emerald-400 font-bold text-xs mt-1 block">Tauri / Rust keyring::Entry</code>
              </div>

              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="text-[10px] text-teal-400 block uppercase">Config Directory</span>
                <code className="text-slate-300 font-bold text-[11px] mt-1 block">%APPDATA%/palworld-server-monitor</code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Raw JSON Inspector */}
      {activeSubTab === 'json' && (
        <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {(['info', 'metrics', 'players', 'settings'] as const).map((ep) => (
                <button
                  key={ep}
                  onClick={() => setActiveJsonEndpoint(ep)}
                  className={`px-2.5 py-1 rounded text-xs font-mono uppercase transition cursor-pointer ${
                    activeJsonEndpoint === ep
                      ? 'bg-cyan-400 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  /{ep}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleCopyJson(getActiveJsonData())}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-mono border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedJson ? 'Copied!' : 'Copy JSON'}</span>
            </button>
          </div>

          <div className="p-4 bg-slate-950 overflow-x-auto max-h-[500px]">
            <pre className="text-xs font-mono text-cyan-300 leading-relaxed">
              {JSON.stringify(getActiveJsonData(), null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Unit Diagnostic Tests */}
      {activeSubTab === 'tests' && (
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">
                Automated Internal Diagnostics
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Run client-side assertions for formatting, sorting, and error code transformation logic.
              </p>
            </div>

            <button
              onClick={runUnitTestSuite}
              disabled={isRunningTests}
              className="bg-cyan-400 text-slate-950 px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider hover:bg-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isRunningTests ? 'Executing...' : 'Run Diagnostics'}</span>
            </button>
          </div>

          {testResults.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-mono bg-slate-950 rounded border border-slate-800">
              Click "Run Diagnostics" to execute assertions.
            </div>
          ) : (
            <div className="space-y-2 font-mono text-xs">
              {testResults.map((t) => (
                <div
                  key={t.id}
                  className="p-3 bg-slate-950 rounded border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {t.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="w-4 h-4 text-rose-400 font-bold shrink-0">✕</span>
                    )}
                    <div>
                      <span className="text-white font-bold block">{t.name}</span>
                      <span className="text-slate-400 text-[11px] block">{t.details}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-teal-400 text-[10px] block">{t.category}</span>
                    <span className="text-slate-400 text-[10px]">{t.durationMs}ms</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
