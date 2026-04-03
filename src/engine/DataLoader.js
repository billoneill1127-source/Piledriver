/**
 * DataLoader.js
 *
 * Pure data access layer for wrestlers, moves, and outcome probabilities.
 * Does not import JSON directly — caller passes the raw data so this class
 * is usable in both the Vite app (JSON imports) and Node test scripts
 * (createRequire).
 *
 * Usage in Vite app:
 *   import wrestlersRaw from '../data/wrestlers.json';
 *   import movesRaw     from '../data/moves.json';
 *   import outcomesRaw  from '../data/outcomes.json';
 *   import { DataLoader } from './DataLoader.js';
 *   export const data = new DataLoader(wrestlersRaw, movesRaw, outcomesRaw);
 */

export class DataLoader {
  /**
   * @param {object} wrestlersRaw - parsed wrestlers.json (has .wrestlers array + ._schema)
   * @param {Array}  movesRaw     - parsed moves.json (array)
   * @param {object} outcomesRaw  - parsed outcomes.json (offense_id → defense_id → probs)
   */
  constructor(wrestlersRaw, movesRaw, outcomesRaw) {
    /** @type {Array} */
    this.wrestlers = wrestlersRaw.wrestlers;

    /** @type {Array} */
    this.moves = movesRaw;

    /** @type {object} */
    this.outcomes = outcomesRaw;

    // Fast lookup maps
    this._wrestlerMap = Object.fromEntries(this.wrestlers.map(w => [w.id, w]));
    this._moveMap     = Object.fromEntries(this.moves.map(m => [m.id, m]));
  }

  // ── Lookups ──────────────────────────────────────────────────────────────

  /** @returns {object|null} */
  getWrestler(id) {
    return this._wrestlerMap[id] ?? null;
  }

  /** @returns {object|null} */
  getMove(id) {
    return this._moveMap[id] ?? null;
  }

  /**
   * Returns the probability table for a given offense/defense pair, or null
   * if the pair is not in outcomes.json.
   * @returns {{ success: number, escape: number, block: number, reversal: number }|null}
   */
  getOutcomes(offenseId, defenseId) {
    return this.outcomes[offenseId]?.[defenseId] ?? null;
  }

  // ── Move filtering ────────────────────────────────────────────────────────

  /**
   * Returns all moves of the given type that the wrestler qualifies for.
   * Requirements: min_strength, min_agility, min_experience (mapped to brains).
   *
   * @param {object} wrestler - wrestler data object (with .attrs)
   * @param {'Offense'|'Defense'} type
   * @returns {Array}
   */
  getAvailableMoves(wrestler, type) {
    const a = wrestler.attrs;
    return this.moves.filter(move => {
      if (move.type !== type) return false;
      const r = move.requirements;
      return (
        a.strength >= r.min_strength &&
        a.agility  >= r.min_agility  &&
        a.brains   >= r.min_experience  // experience = brains per schema
      );
    });
  }

  /** @returns {Array} all wrestlers */
  getAllWrestlers() {
    return this.wrestlers;
  }
}
