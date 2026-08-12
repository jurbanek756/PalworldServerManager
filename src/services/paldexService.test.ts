import { describe, it, expect } from 'vitest';
import { PaldexService } from './paldexService';

describe('PaldexService Tests', () => {
  it('loads Paldex entries correctly', () => {
    const pals = PaldexService.getAllPals();
    expect(pals.length).toBeGreaterThan(100);
  });

  it('looks up Pal entry by exact display name', () => {
    const pal = PaldexService.getEntry('Lamball');
    expect(pal).not.toBeNull();
    expect(pal?.key).toBe('001');
    expect(pal?.name).toBe('Lamball');
    expect(pal?.types[0]?.name).toBe('neutral');
  });

  it('looks up Pal entry by key number', () => {
    const pal = PaldexService.getEntry('085');
    expect(pal).not.toBeNull();
    expect(pal?.name).toBe('Relaxaurus');
  });

  it('translates Unreal Engine internal class names', () => {
    const pal = PaldexService.getEntry('SheepBall');
    expect(pal).not.toBeNull();
    expect(pal?.name).toBe('Lamball');

    const dragon = PaldexService.getEntry('DesertDragon');
    expect(dragon).not.toBeNull();
    expect(dragon?.name).toBe('Relaxaurus');
  });

  it('filters Pals by element type', () => {
    const firePals = PaldexService.searchPals({ elementType: 'fire' });
    expect(firePals.length).toBeGreaterThan(0);
    expect(firePals.every(p => p.types.some(t => t.name === 'fire'))).toBe(true);
  });

  it('filters Pals by work suitability', () => {
    const miners = PaldexService.searchPals({ suitabilityType: 'mining' });
    expect(miners.length).toBeGreaterThan(0);
    expect(miners.every(p => p.suitability.some(s => s.type === 'mining'))).toBe(true);
  });

  it('formats drop names cleanly', () => {
    const dropName = PaldexService.formatDropName('high_quality_pal_oil');
    expect(dropName).toBe('High Quality Pal Oil');
  });
});
