import React from 'react';
import { Activity, Zap, Users, TrendingUp } from 'lucide-react';

export interface TelemetryPoint {
  timestamp: string;
  fps: number;
  frameTime: number;
  playerCount: number;
}

interface TelemetrySparklineProps {
  history: TelemetryPoint[];
}

export const TelemetrySparkline: React.FC<TelemetrySparklineProps> = ({ history }) => {
  if (history.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 text-center text-xs text-slate-500 font-mono">
        Collecting performance telemetry data...
      </div>
    );
  }

  // Calculate SVG Polyline points
  const width = 300;
  const height = 50;

  const buildSparklinePoints = (values: number[], maxVal: number, minVal: number = 0) => {
    if (values.length < 2) return '';
    const range = Math.max(1, maxVal - minVal);
    const step = width / (values.length - 1);

    return values
      .map((val, idx) => {
        const x = idx * step;
        const normalized = (val - minVal) / range;
        const y = height - normalized * (height - 8) - 4;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const fpsValues = history.map((h) => h.fps);
  const frameTimeValues = history.map((h) => h.frameTime);
  const playerValues = history.map((h) => h.playerCount);

  const maxFps = Math.max(60, ...fpsValues);
  const maxFrameTime = Math.max(33.3, ...frameTimeValues);
  const maxPlayers = Math.max(16, ...playerValues);

  const fpsPoints = buildSparklinePoints(fpsValues, maxFps, 0);
  const frameTimePoints = buildSparklinePoints(frameTimeValues, maxFrameTime, 0);
  const playerPoints = buildSparklinePoints(playerValues, maxPlayers, 0);

  const latestFps = fpsValues[fpsValues.length - 1] ?? 60;
  const latestFrameTime = frameTimeValues[frameTimeValues.length - 1] ?? 16.6;
  const latestPlayers = playerValues[playerValues.length - 1] ?? 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Real-Time Server Telemetry & Performance Sparklines
          </h3>
        </div>
        <span className="text-[10px] font-mono text-teal-400">
          History: {history.length} data points
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* FPS Sparkline */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" /> Server FPS Trend
            </span>
            <span className="font-mono text-sm font-bold text-emerald-400">
              {latestFps.toFixed(1)} FPS
            </span>
          </div>

          <div className="h-12 w-full">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
              <polyline
                fill="none"
                stroke="#34d399"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={fpsPoints}
              />
            </svg>
          </div>
        </div>

        {/* Frame Time Sparkline */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" /> Frame Time Trend (ms)
            </span>
            <span className="font-mono text-sm font-bold text-cyan-300">
              {latestFrameTime.toFixed(1)} ms
            </span>
          </div>

          <div className="h-12 w-full">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
              <polyline
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={frameTimePoints}
              />
            </svg>
          </div>
        </div>

        {/* Active Player Sparkline */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3 text-purple-400" /> Active Players Trend
            </span>
            <span className="font-mono text-sm font-bold text-purple-300">
              {latestPlayers} Players
            </span>
          </div>

          <div className="h-12 w-full">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
              <polyline
                fill="none"
                stroke="#c084fc"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={playerPoints}
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
