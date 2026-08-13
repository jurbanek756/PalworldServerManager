import React from 'react';
import { X, ExternalLink, Flame, Droplets, Zap, Sparkles, Shield, Heart, Activity, Gauge, Award, Layers } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { PaldexEntry } from '../types/paldex';
import { PaldexService } from '../services/paldexService';

interface PalDetailModalProps {
  pal: PaldexEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PalDetailModal: React.FC<PalDetailModalProps> = ({ pal, isOpen, onClose }) => {
  if (!isOpen || !pal) return null;

  const handleOpenWiki = async (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    try {
      await openUrl(url);
    } catch (err) {
      console.warn('Failed to open URL using tauri plugin-opener, falling back to window.open', err);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header Banner */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-xs font-bold text-cyan-400">
              #{pal.key}
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">{pal.name}</h2>
            
            <div className="flex items-center gap-1.5 ml-2">
              {pal.types.map((typeObj, i) => (
                <span 
                  key={i} 
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase border flex items-center gap-1 ${getElementColor(typeObj.name)}`}
                >
                  {typeObj.name}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pal.wiki && (
              <a
                href={pal.wiki}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => handleOpenWiki(e, pal.wiki)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 rounded transition flex items-center gap-1 text-xs"
                title="View Official Wiki"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-mono">Wiki</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 rounded transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          
          {/* Main Info Hero (Image & Lore) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <div className="flex flex-col items-center justify-center p-2 bg-slate-900 rounded-lg border border-slate-800 shrink-0">
              <img 
                src={pal.image} 
                alt={pal.name} 
                className="w-32 h-32 object-contain drop-shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                onError={(e) => {
                  if (pal.imageWiki) (e.target as HTMLImageElement).src = pal.imageWiki;
                }}
              />
            </div>

            <div className="sm:col-span-2 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 block mb-1">
                  Paldex Entry Description
                </span>
                <p className="text-slate-300 leading-relaxed italic bg-slate-900/80 p-3 rounded border border-slate-800/60">
                  "{pal.description}"
                </p>
              </div>

              {/* Partner Skill / Aura */}
              {pal.aura && (
                <div className="bg-cyan-950/30 border border-cyan-500/30 p-3 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-bold uppercase text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Partner Skill: {pal.aura.name.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-snug">
                    {pal.aura.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Base Stats Matrix */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              Base Stats Attributes
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                  <Heart className="w-3 h-3 text-rose-400" /> Base HP
                </span>
                <span className="text-lg font-mono font-bold text-white">{pal.stats.hp}</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" /> Melee / Ranged
                </span>
                <span className="text-lg font-mono font-bold text-amber-300">
                  {pal.stats.attack.melee} / {pal.stats.attack.ranged}
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-400" /> Defense
                </span>
                <span className="text-lg font-mono font-bold text-emerald-300">{pal.stats.defense}</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-cyan-400" /> Ride / Run Speed
                </span>
                <span className="text-lg font-mono font-bold text-cyan-300">
                  {pal.stats.speed.ride} / {pal.stats.speed.run}
                </span>
              </div>
            </div>
          </div>

          {/* Work Suitability Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-400" />
              Work Suitabilities
            </h3>

            <div className="flex flex-wrap gap-2">
              {pal.suitability.map((suit, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  <img src={suit.image} alt={suit.type} className="w-4 h-4 object-contain" />
                  <span className="text-xs font-bold text-slate-200 capitalize">
                    {suit.type.replace(/_/g, ' ')}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                    Lv. {suit.level}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Drop Items Table */}
          {pal.drops && pal.drops.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-400" />
                Material Drops
              </h3>
              <div className="flex flex-wrap gap-2">
                {pal.drops.map((dropKey, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-slate-950 text-purple-300 border border-purple-500/30 rounded font-mono text-[11px] font-medium">
                    📦 {PaldexService.formatDropName(dropKey)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Active Skills Unlocks */}
          {pal.skills && pal.skills.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-yellow-400" />
                Learned Active Skills
              </h3>

              <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                      <th className="p-2.5">Level</th>
                      <th className="p-2.5">Skill Name</th>
                      <th className="p-2.5">Element</th>
                      <th className="p-2.5">CD</th>
                      <th className="p-2.5">Power</th>
                      <th className="p-2.5">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {pal.skills.map((skill, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/60 transition">
                        <td className="p-2.5 font-mono font-bold text-amber-400">Lv. {skill.level}</td>
                        <td className="p-2.5 font-bold text-white capitalize">{skill.name.replace(/_/g, ' ')}</td>
                        <td className="p-2.5 capitalize text-cyan-300 font-mono">{skill.type}</td>
                        <td className="p-2.5 font-mono text-slate-300">{skill.cooldown}s</td>
                        <td className="p-2.5 font-mono font-bold text-emerald-400">{skill.power}</td>
                        <td className="p-2.5 text-slate-400 truncate max-w-xs" title={skill.description}>
                          {skill.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
