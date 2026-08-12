import React, { useState, useMemo } from 'react';
import { SlidersHorizontal, Search, Copy, Check, Shield, Zap, Swords, Tent, Settings, Clock, Filter } from 'lucide-react';
import { PalworldSettings } from '../types';
import { formatSettingName, formatSettingValue } from '../format';

interface SettingsTabProps {
  settings: PalworldSettings | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, val: any) => {
    const stringVal = Array.isArray(val) ? val.join(',') : String(val);
    navigator.clipboard.writeText(`${key}=${stringVal}`);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const categoryFilters = [
    { id: 'all', label: 'All Settings' },
    { id: 'rates', label: 'Rates & Multipliers' },
    { id: 'combat', label: 'Combat & Damage' },
    { id: 'base', label: 'Guild & Base Camp' },
    { id: 'system', label: 'System & Network' },
    { id: 'other', label: 'Other Settings' },
  ];

  const groupedSettings = useMemo(() => {
    if (!settings) return [];

    const ratesKeys = [
      'ExpRate', 'PalCaptureRate', 'PalSpawnNumRate', 'CollectionDropRate', 
      'CollectionObjectHpRate', 'CollectionObjectRespawnSpeedRate', 'EnemyDropItemQuantityRate', 
      'DayTimeSpeedRate', 'NightTimeSpeedRate', 'WorkSpeedRate', 'ItemWeightRate', 'ItemCorruptionMultiplier',
      'MonsterFarmActionSpeedRate', 'PalStaminaDecreaceRate', 'PalStomachDecreaceRate',
      'PlayerStaminaDecreaceRate', 'PlayerStomachDecreaceRate', 'EquipmentDurabilityDamageRate',
      'PalEggDefaultHatchingTime'
    ];

    const combatKeys = [
      'PlayerDamageRateAttack', 'PlayerDamageRateDefense', 'PalDamageRateAttack', 
      'PalDamageRateDefense', 'BuildObjectHpRate', 'BuildObjectDamageRate', 'BuildObjectDeteriorationDamageRate',
      'AdditionalDropItemNumWhenPlayerKillingInPvPMode', 'AdditionalDropItemWhenPlayerKillingInPvPMode',
      'bEnableFriendlyFire', 'bEnablePlayerToPlayerDamage', 'bEnableDefenseOtherGuildPlayer', 'bEnableInvaderEnemy',
      'EnablePredatorBossPal', 'bHardcore', 'DeathPenalty'
    ];

    const baseKeys = [
      'GuildPlayerMaxNum', 'BaseCampMaxNum', 'BaseCampMaxNumInGuild', 'BaseCampWorkerMaxNum', 'DropItemMaxNum',
      'DropItemMaxNum_UNKO', 'MaxBuildingLimitNum', 'AutoResetGuildTimeNoOnlinePlayers', 'bAutoResetGuildNoOnlinePlayers',
      'GuildRejoinCooldownMinutes'
    ];

    const systemKeys = [
      'RESTAPIEnabled', 'RESTAPIPort', 'RCONEnabled', 'RCONPort', 'PublicIP', 'PublicPort',
      'ServerName', 'ServerDescription', 'Difficulty', 'Region', 'BanListURL', 'LogFormatType',
      'CrossplayPlatforms', 'bAllowClientMod', 'bUseAuth'
    ];

    const filterEntry = (key: string, val: any) => {
      const formattedTitle = formatSettingName(key);
      const valStr = Array.isArray(val) ? val.join(' ') : String(val);

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        key.toLowerCase().includes(q) || 
        formattedTitle.toLowerCase().includes(q) || 
        valStr.toLowerCase().includes(q)
      );
    };

    const categories = [
      {
        id: 'rates',
        title: 'Game Rates & Multipliers',
        icon: Zap,
        color: 'text-cyan-400',
        items: Object.entries(settings)
          .filter(([k, v]) => ratesKeys.includes(k) && filterEntry(k, v))
          .map(([k, v]) => ({ key: k, formattedTitle: formatSettingName(k), value: v }))
      },
      {
        id: 'combat',
        title: 'Combat, Damage & Durability',
        icon: Swords,
        color: 'text-rose-400',
        items: Object.entries(settings)
          .filter(([k, v]) => combatKeys.includes(k) && filterEntry(k, v))
          .map(([k, v]) => ({ key: k, formattedTitle: formatSettingName(k), value: v }))
      },
      {
        id: 'base',
        title: 'Guild & Base Camp Limits',
        icon: Tent,
        color: 'text-emerald-400',
        items: Object.entries(settings)
          .filter(([k, v]) => baseKeys.includes(k) && filterEntry(k, v))
          .map(([k, v]) => ({ key: k, formattedTitle: formatSettingName(k), value: v }))
      },
      {
        id: 'system',
        title: 'Server System & Network Config',
        icon: Settings,
        color: 'text-teal-400',
        items: Object.entries(settings)
          .filter(([k, v]) => systemKeys.includes(k) && filterEntry(k, v))
          .map(([k, v]) => ({ key: k, formattedTitle: formatSettingName(k), value: v }))
      },
      {
        id: 'other',
        title: 'Additional World Settings',
        icon: SlidersHorizontal,
        color: 'text-purple-400',
        items: Object.entries(settings)
          .filter(([k, v]) => 
            !ratesKeys.includes(k) && 
            !combatKeys.includes(k) && 
            !baseKeys.includes(k) && 
            !systemKeys.includes(k) && 
            filterEntry(k, v)
          )
          .map(([k, v]) => ({ key: k, formattedTitle: formatSettingName(k), value: v }))
      }
    ];

    return categories
      .filter((cat) => activeCategoryFilter === 'all' || cat.id === activeCategoryFilter)
      .filter((cat) => cat.items.length > 0);
  }, [settings, searchQuery, activeCategoryFilter]);

  const renderValueBadge = (key: string, val: any) => {
    if (Array.isArray(val)) {
      if (val.length === 0) {
        return <span className="text-slate-500 italic text-xs">None</span>;
      }
      return (
        <div className="flex flex-wrap gap-1 justify-end">
          {val.map((item, idx) => (
            <span key={idx} className="px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-500/30 text-[11px] font-mono font-medium">
              {item}
            </span>
          ))}
        </div>
      );
    }

    if (typeof val === 'boolean') {
      return val ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          TRUE
        </span>
      ) : (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
          FALSE
        </span>
      );
    }

    if (typeof val === 'number' && key.toLowerCase().includes('rate')) {
      const displayVal = formatSettingValue(val);
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
          {displayVal}x
        </span>
      );
    }

    const displayVal = formatSettingValue(val);
    return (
      <code className="text-xs font-mono text-cyan-300 font-semibold break-all">
        {displayVal}
      </code>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search Header & Category Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-teal-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search setting titles or raw keys (e.g. Exp Rate, REST API, PalCaptureRate)..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none font-sans placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Shield className="w-3.5 h-3.5 text-teal-400" />
            <span>Read-Only: Configured via <code className="text-cyan-400 font-mono">PalWorldSettings.ini</code></span>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-500 mr-1 shrink-0" />
          {categoryFilters.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryFilter(cat.id)}
              className={`px-3 py-1 rounded text-[11px] font-medium transition cursor-pointer shrink-0 ${
                activeCategoryFilter === cat.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Settings Groups */}
      {!settings || groupedSettings.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center text-slate-400 text-xs">
          <SlidersHorizontal className="w-8 h-8 text-slate-800 mx-auto mb-2" />
          {settings ? 'No server settings matched your query or filter.' : 'Querying Palworld REST API GET /settings...'}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedSettings.map((group) => {
            const IconComp = group.icon;
            return (
              <div key={group.id} className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
                <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <IconComp className={`w-4 h-4 ${group.color}`} />
                    <h3 className="font-bold text-xs text-teal-400 uppercase tracking-widest">{group.title}</h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.items.map((item) => (
                    <div 
                      key={item.key} 
                      className="p-3.5 bg-slate-950 hover:bg-slate-900/60 rounded border border-slate-800/80 hover:border-slate-700 flex flex-col justify-between group transition space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="overflow-hidden">
                          <span className="text-xs font-bold text-slate-100 block tracking-tight leading-snug" title={item.formattedTitle}>
                            {item.formattedTitle}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 block truncate mt-0.5" title={item.key}>
                            {item.key}
                          </span>
                        </div>

                        <button
                          onClick={() => handleCopy(item.key, item.value)}
                          className="p-1.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded border border-slate-700/60 transition shrink-0 cursor-pointer"
                          title={`Copy ${item.key}=${item.value}`}
                        >
                          {copiedKey === item.key ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="pt-1 border-t border-slate-900 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Value:</span>
                        <div className="shrink-0 text-right">
                          {renderValueBadge(item.key, item.value)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
