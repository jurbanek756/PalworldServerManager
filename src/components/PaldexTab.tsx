import React, { useState, useMemo } from 'react';
import { BookOpen, Search, Filter, Sparkles, Layers, Award, Shield, Heart, Zap, RefreshCw } from 'lucide-react';
import { PaldexService } from '../services/paldexService';
import { PaldexEntry, PalElementKind, PalSuitabilityKind } from '../types/paldex';
import { PalDetailModal } from './PalDetailModal';

export const PaldexTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeElement, setActiveElement] = useState<PalElementKind | 'all'>('all');
  const [activeWork, setActiveWork] = useState<PalSuitabilityKind | 'all'>('all');
  const [selectedPal, setSelectedPal] = useState<PaldexEntry | null>(null);

  const filteredPals = useMemo(() => {
    return PaldexService.searchPals({
      term: searchQuery,
      elementType: activeElement,
      suitabilityType: activeWork,
    });
  }, [searchQuery, activeElement, activeWork]);

  const elementOptions: { id: PalElementKind | 'all'; label: string; bgClass: string }[] = [
    { id: 'all', label: 'All Elements', bgClass: 'bg-slate-800 text-slate-200' },
    { id: 'neutral', label: 'Neutral', bgClass: 'bg-slate-700 text-slate-200' },
    { id: 'fire', label: 'Fire', bgClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40' },
    { id: 'water', label: 'Water', bgClass: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' },
    { id: 'grass', label: 'Grass', bgClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
    { id: 'electric', label: 'Electric', bgClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
    { id: 'ice', label: 'Ice', bgClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
    { id: 'ground', label: 'Ground', bgClass: 'bg-amber-600/20 text-amber-400 border-amber-500/40' },
    { id: 'dragon', label: 'Dragon', bgClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
    { id: 'dark', label: 'Dark', bgClass: 'bg-slate-700/40 text-slate-300 border-slate-600' },
  ];

  const workOptions: { id: PalSuitabilityKind | 'all'; label: string }[] = [
    { id: 'all', label: 'All Work Types' },
    { id: 'kindling', label: '🔥 Kindling' },
    { id: 'watering', label: '💧 Watering' },
    { id: 'planting', label: '🌱 Planting' },
    { id: 'generating_electricity', label: '⚡ Electricity' },
    { id: 'handiwork', label: '🛠️ Handiwork' },
    { id: 'gathering', label: '🌾 Gathering' },
    { id: 'lumbering', label: '🪵 Lumbering' },
    { id: 'mining', label: '⛏️ Mining' },
    { id: 'cooling', label: '❄️ Cooling' },
    { id: 'transporting', label: '🚚 Transporting' },
    { id: 'farming', label: '🐄 Farming' },
  ];

  const getElementColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'fire': return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      case 'water': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';
      case 'grass': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'electric': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      case 'ice': return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'ground': return 'bg-amber-600/20 text-amber-400 border-amber-500/40';
      case 'dragon': return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'dark': return 'bg-slate-700/40 text-slate-300 border-slate-600';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Paldex Compendium & Reference Guide
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Complete Palworld encyclopedia: search 137+ Pals, elemental attributes, work suitabilities, base stats, and drop tables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-cyan-950 text-cyan-300 rounded text-xs font-mono font-bold border border-cyan-500/30">
            Pals Loaded: {filteredPals.length}
          </span>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Pal name, ID, skill, or drop material (e.g. Lamball, Relaxaurus, Pal Oil, Meteor)..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none font-sans"
            />
          </div>

          {/* Work Suitability Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-400 shrink-0" />
            <select
              value={activeWork}
              onChange={(e) => setActiveWork(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 focus:border-emerald-400 text-xs text-slate-200 rounded px-3 py-1.5 focus:outline-none"
            >
              {workOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Element Type Selector Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
          {elementOptions.map((elem) => (
            <button
              key={elem.id}
              onClick={() => setActiveElement(elem.id)}
              className={`px-3 py-1 rounded text-[11px] font-bold uppercase transition cursor-pointer shrink-0 border ${
                activeElement === elem.id
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.2)]'
                  : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              {elem.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pals Cards Grid */}
      {filteredPals.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center text-slate-400 text-xs">
          <BookOpen className="w-8 h-8 text-slate-700 mx-auto mb-2" />
          No Pals matched your filter or search query.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 items-stretch">
          {filteredPals.map((pal) => (
            <div
              key={pal.key}
              onClick={() => setSelectedPal(pal)}
              className="bg-slate-950 hover:bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between h-full space-y-3 group shadow-sm hover:shadow-[0_0_15px_rgba(34,211,238,0.1)]"
            >
              {/* Top Header Row */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
                    #{pal.key}
                  </span>
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition mt-1">
                    {pal.name}
                  </h3>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {pal.types.map((t, idx) => (
                    <span
                      key={idx}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border flex items-center gap-1 ${getElementColor(t.name)}`}
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Center Pal Image */}
              <div className="flex justify-center p-2 bg-slate-900/60 rounded-lg border border-slate-900 group-hover:border-slate-800 transition">
                <img
                  src={pal.image}
                  alt={pal.name}
                  className="w-20 h-20 object-contain group-hover:scale-105 transition-transform"
                  onError={(e) => {
                    if (pal.imageWiki) (e.target as HTMLImageElement).src = pal.imageWiki;
                  }}
                />
              </div>

              {/* Work Suitabilities Section (Wrapped on new lines, no scrollbar) */}
              <div className="flex-1 flex flex-col justify-end space-y-1">
                <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider font-mono">Work Suitabilities</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {pal.suitability.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-900 text-slate-300 border border-slate-800 flex items-center gap-1"
                    >
                      {s.image && (
                        <img src={s.image} alt={s.type} className="w-3 h-3 object-contain shrink-0" />
                      )}
                      <span className="capitalize">{s.type.replace(/_/g, ' ')}</span>
                      <span className="text-cyan-400 font-bold">L{s.level}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Base Stats Summary */}
              <div className="pt-2 border-t border-slate-900/90 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>HP: <strong className="text-white">{pal.stats.hp}</strong></span>
                <span>Atk: <strong className="text-amber-300">{pal.stats.attack.melee}</strong></span>
                <span>Def: <strong className="text-emerald-300">{pal.stats.defense}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pal Detail Dossier Modal */}
      <PalDetailModal
        pal={selectedPal}
        isOpen={Boolean(selectedPal)}
        onClose={() => setSelectedPal(null)}
      />
    </div>
  );
};
