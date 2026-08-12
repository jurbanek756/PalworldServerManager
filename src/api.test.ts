import { describe, test, expect } from 'vitest';
import { parseError, formatUptime, formatFpsQuality, formatPing } from './api';

describe('api.ts utilities', () => {
  describe('parseError', () => {
    test('correctly parses [auth] errors', () => {
      const err = parseError('[auth] Invalid password specified');
      expect(err.code).toBe('AUTH_FAILED');
      expect(err.title).toContain('Authentication Failed');
      expect(err.troubleshooting.length).toBeGreaterThan(0);
    });

    test('correctly parses credentials rejected messages without tag', () => {
      const err = parseError('Server credentials were rejected');
      expect(err.code).toBe('AUTH_FAILED');
    });

    test('correctly parses [timeout] errors', () => {
      const err = parseError('[timeout] Connection timed out after 10s');
      expect(err.code).toBe('TIMEOUT');
      expect(err.title).toContain('Timeout');
    });

    test('correctly parses [malformed_response] errors', () => {
      const err = parseError('[malformed_response] Bad JSON syntax');
      expect(err.code).toBe('MALFORMED_RESPONSE');
      expect(err.title).toContain('Malformed Response');
    });

    test('defaults to SERVER_UNAVAILABLE for generic errors', () => {
      const err = parseError('[network] Host unreachable');
      expect(err.code).toBe('SERVER_UNAVAILABLE');
      expect(err.message).toBe('Host unreachable');
    });
  });

  describe('formatUptime', () => {
    test('handles 0 or negative seconds', () => {
      expect(formatUptime(0)).toBe('0s');
      expect(formatUptime(-10)).toBe('0s');
    });

    test('formats seconds only', () => {
      expect(formatUptime(45)).toBe('45s');
    });

    test('formats minutes and seconds', () => {
      expect(formatUptime(125)).toBe('2m 5s');
    });

    test('formats hours, minutes, and seconds', () => {
      expect(formatUptime(3665)).toBe('1h 1m 5s');
    });

    test('formats days', () => {
      expect(formatUptime(172800)).toBe('2d 0h 0m 0s');
    });
  });

  describe('formatFpsQuality', () => {
    test('returns Optimal for >= 55 FPS', () => {
      const res = formatFpsQuality(60);
      expect(res.text).toContain('Optimal');
      expect(res.colorClass).toContain('emerald');
    });

    test('returns Stable for 30-54 FPS', () => {
      const res = formatFpsQuality(40);
      expect(res.text).toBe('Stable');
      expect(res.colorClass).toContain('amber');
    });

    test('returns Degraded for < 30 FPS', () => {
      const res = formatFpsQuality(20);
      expect(res.text).toBe('Degraded Performance');
      expect(res.colorClass).toContain('rose');
    });
  });

  describe('formatPing', () => {
    test('limits long floating point decimals to at most 2 places', () => {
      expect(formatPing(23.456789123)).toBe('23.46 ms');
      expect(formatPing(12.3)).toBe('12.3 ms');
    });

    test('formats integer pings without decimal points', () => {
      expect(formatPing(15)).toBe('15 ms');
      expect(formatPing(0)).toBe('0 ms');
    });

    test('handles invalid or non-numeric values gracefully', () => {
      expect(formatPing(NaN)).toBe('0 ms');
      expect(formatPing(Infinity)).toBe('0 ms');
    });
  });
});
