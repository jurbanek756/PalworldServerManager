import palsData from '../assets/paldex/pals.json';
import itemData from '../assets/paldex/item.json';
import type { PaldexEntry, PalElementKind, PalItem, PalSuitabilityKind } from '../types/paldex';

// Comprehensive Unreal Engine character class string -> Paldex entry name map
const ENGINE_CLASS_MAP: Record<string, string> = {
  'sheepball': 'Lamball',
  'pinkcat': 'Cattiva',
  'chickenpal': 'Chikipi',
  'foxsparks': 'Foxsparks',
  'desertdragon': 'Relaxaurus',
  'lazydragon': 'Relaxaurus',
  'lazydragon_electric': 'Relaxaurus Lux',
  'flamebison': 'Arsox',
  'hedgedog': 'Jolthog',
  'hedgedog_ice': 'Jolthog Cryst',
  'bluedragon': 'Azurobe',
  'grasspanda': 'Dinossom',
  'grasspanda_electric': 'Dinossom Lux',
  'yeti': 'Wumpo',
  'yeti_grass': 'Wumpo Botan',
  'deer': 'Eikthyrdeer',
  'deer_ground': 'Eikthyrdeer Terra',
  'naughtycat': 'Grintale',
  'monkey': 'Tanzee',
  'penguin': 'Pengullet',
  'captainpenguin': 'Penking',
  'firekirin': 'Pyrin',
  'firekirin_dark': 'Pyrin Noct',
  'eleccat': 'Sparkit',
  'bastet': 'Mau',
  'bastet_ice': 'Mau Cryst',
  'boar': 'Rushoar',
  'gryphon': 'Shadowbeak',
  'anubis': 'Anubis',
  'jetragon': 'Jetragon',
  'frostallion': 'Frostallion',
  'frostallion_dark': 'Frostallion Noct',
  'paladius': 'Paladius',
  'necromus': 'Necromus',
  'jormuntide': 'Jormuntide',
  'jormuntide_fire': 'Jormuntide Ignis',
};

class PaldexServiceClass {
  private palsByName: Map<string, PaldexEntry> = new Map();
  private palsByKey: Map<string, PaldexEntry> = new Map();
  private itemMap: Map<string, PalItem> = new Map();
  private allPals: PaldexEntry[] = [];
  private isLoaded = false;

  constructor() {
    this.initData();
  }

  private initData(): void {
    if (this.isLoaded) return;
    this.allPals = palsData as unknown as PaldexEntry[];
    this.allPals.forEach((pal) => {
      this.palsByName.set(pal.name.toLowerCase(), pal);
      this.palsByKey.set(pal.key, pal);
    });

    if (Array.isArray(itemData)) {
      (itemData as unknown as PalItem[]).forEach((item) => {
        const itemKey = item.id || item.key;
        if (itemKey) this.itemMap.set(itemKey.toLowerCase(), item);
      });
    }
    this.isLoaded = true;
  }

  async initialize(): Promise<void> {
    this.initData();
  }

  getAllPals(): PaldexEntry[] {
    return this.allPals;
  }

  /**
   * Look up a Pal entry by display name, key, or internal engine class name.
   */
  getEntry(identifier?: string): PaldexEntry | null {
    if (!identifier) return null;
    const clean = identifier.trim().toLowerCase();

    // 1. Direct match by name or key
    if (this.palsByName.has(clean)) return this.palsByName.get(clean)!;
    if (this.palsByKey.has(clean)) return this.palsByKey.get(clean)!;

    // 2. Direct partial match (e.g. if actor name contains "Relaxaurus")
    for (const [name, entry] of this.palsByName.entries()) {
      if (clean.includes(name) || name.includes(clean)) {
        return entry;
      }
    }

    // 3. Unreal Engine class mapping fallback
    const mappedName = ENGINE_CLASS_MAP[clean];
    if (mappedName && this.palsByName.has(mappedName.toLowerCase())) {
      return this.palsByName.get(mappedName.toLowerCase())!;
    }

    return null;
  }

  /**
   * Search and filter Paldex entries by term, element type, suitability type, or drop item.
   */
  searchPals(query: {
    term?: string;
    elementType?: PalElementKind | 'all';
    suitabilityType?: PalSuitabilityKind | 'all';
    dropItem?: string;
  }): PaldexEntry[] {
    return this.allPals.filter((pal) => {
      if (query.elementType && query.elementType !== 'all') {
        if (!pal.types.some(t => t.name === query.elementType)) return false;
      }
      if (query.suitabilityType && query.suitabilityType !== 'all') {
        if (!pal.suitability.some(s => s.type === query.suitabilityType)) return false;
      }
      if (query.dropItem) {
        const dropQ = query.dropItem.toLowerCase();
        if (!pal.drops.some(d => d.toLowerCase().includes(dropQ))) return false;
      }
      if (query.term) {
        const q = query.term.toLowerCase();
        const matchesName = pal.name.toLowerCase().includes(q);
        const matchesKey = pal.key.includes(q);
        const matchesType = pal.types.some(t => t.name.toLowerCase().includes(q));
        const matchesWork = pal.suitability.some(s => s.type.toLowerCase().includes(q));
        const matchesSkill = pal.skills.some(s => s.name.toLowerCase().includes(q));
        const matchesDrop = pal.drops.some(d => d.toLowerCase().includes(q));
        return matchesName || matchesKey || matchesType || matchesWork || matchesSkill || matchesDrop;
      }
      return true;
    });
  }

  /**
   * Format internal drop key (e.g., "high_quality_pal_oil") into clean title case ("High Quality Pal Oil")
   */
  formatDropName(dropKey: string): string {
    const item = this.itemMap.get(dropKey.toLowerCase());
    if (item && item.name) return item.name;
    return dropKey
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Check if a Pal's active base camp task matches its native suitabilities
   */
  auditWorkSuitability(pal: PaldexEntry, action?: string): { isOptimal: boolean; level?: number; matchedType?: string } {
    if (!action) return { isOptimal: true };
    const act = action.toLowerCase();

    for (const suit of pal.suitability) {
      const typeStr = suit.type.toLowerCase();
      if (act.includes(typeStr) || (typeStr === 'generating_electricity' && act.includes('electric'))) {
        return { isOptimal: true, level: suit.level, matchedType: suit.type };
      }
    }

    return { isOptimal: false };
  }
}

export const PaldexService = new PaldexServiceClass();
