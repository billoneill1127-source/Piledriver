/**
 * Commentary.js
 *
 * Picks commentary lines for match events.
 * Supports dot-notation trigger keys for nested categories (e.g. 'move_success.strike').
 * Anti-repeat: tracks the last 2 used indices per trigger key.
 */

import commentaryData from '../data/commentary.json';

const FALLBACK = 'The action continues!';

export class Commentary {
  constructor() {
    this._data    = commentaryData;
    this._history = new Map(); // trigger key → number[] (last 2 indices used)
  }

  /**
   * Returns a formatted commentary line for the given trigger.
   *
   * @param {string} trigger   - dot-notation key, e.g. 'move_success.slam'
   * @param {object} attacker  - wrestler object with .name
   * @param {object} defender  - wrestler object with .name
   * @returns {string}
   */
  getLine(trigger, attacker, defender) {
    const pool = this._resolve(trigger);
    if (!pool || pool.length === 0) return FALLBACK;

    const used    = this._history.get(trigger) ?? [];
    const indices = pool.map((_, i) => i);
    let candidates = indices.filter(i => !used.includes(i));

    // If all lines exhausted, reset and use full list
    if (candidates.length === 0) candidates = indices;

    const pick = candidates[Math.floor(Math.random() * candidates.length)];

    // Update history (keep last 2)
    const next = [...used, pick].slice(-2);
    this._history.set(trigger, next);

    return pool[pick]
      .replace(/\{attacker\}/g, attacker?.name ?? 'Attacker')
      .replace(/\{defender\}/g, defender?.name ?? 'Defender');
  }

  /** Resolve a dot-notation key into an array of strings. */
  _resolve(trigger) {
    const parts = trigger.split('.');
    let node = this._data;
    for (const part of parts) {
      if (node == null || typeof node !== 'object') return null;
      node = node[part];
    }
    return Array.isArray(node) ? node : null;
  }
}
