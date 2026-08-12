export type PalElementKind = 
  | 'neutral' 
  | 'fire' 
  | 'water' 
  | 'grass' 
  | 'electric' 
  | 'ice' 
  | 'ground' 
  | 'dragon' 
  | 'dark';

export interface PalElementType {
  name: PalElementKind;
  image: string;
}

export type PalSuitabilityKind = 
  | 'kindling' 
  | 'watering' 
  | 'planting' 
  | 'generating_electricity' 
  | 'handiwork' 
  | 'gathering' 
  | 'lumbering' 
  | 'mining' 
  | 'oil_extraction' 
  | 'medicine' 
  | 'cooling' 
  | 'transporting' 
  | 'farming';

export interface PalSuitability {
  type: PalSuitabilityKind;
  image: string;
  level: number;
}

export interface PalAura {
  name: string;
  description: string;
  tech?: string | null;
}

export interface PalSkill {
  level: number;
  name: string;
  type: PalElementKind | string;
  cooldown: number;
  power: number;
  description: string;
}

export interface PalStats {
  hp: number;
  attack: { melee: number; ranged: number };
  defense: number;
  speed: { ride: number; run: number; walk: number };
  stamina: number;
}

export interface PaldexEntry {
  id: number;
  key: string;              // e.g. "001", "085", "085B"
  name: string;             // e.g. "Lamball", "Relaxaurus", "Relaxaurus Lux"
  wiki: string;
  image: string;            // "/paldex/images/paldeck/001.png"
  imageWiki?: string;       // Wiki CDN high-res render URL
  types: PalElementType[];
  suitability: PalSuitability[];
  drops: string[];          // e.g. ["wool", "lamball_mutton"]
  aura: PalAura;
  description: string;      // Paldex lore entry
  skills: PalSkill[];
  stats: PalStats;
}

export interface PalItem {
  id?: string;
  key?: string;
  name: string;
  description?: string;
  image?: string;
}

export interface PalBreedingCombination {
  parentA: string;
  parentB: string;
  child: string;
}
