/**
 * MatchEvents.js
 *
 * Lightweight singleton event bus shared between the React layer (useMatch)
 * and the Phaser scene (MatchScene). No external libraries.
 *
 * Events emitted by useMatch:
 *   'stamina'    → { [wrestlerId]: number, ... }
 *   'damage'     → { wrestlerId, amount }
 *   'turnResult' → enriched TurnResult
 *   'matchOver'  → { winner: wrestlerId, winnerName: string }
 */

class EventEmitter {
  constructor() {
    this._listeners = Object.create(null);
  }

  /** Register a listener. Returns an unsubscribe function. */
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    const fns = this._listeners[event];
    if (fns) this._listeners[event] = fns.filter(f => f !== fn);
  }

  emit(event, data) {
    const fns = this._listeners[event];
    if (fns) fns.forEach(fn => fn(data));
  }

  /** Remove all listeners (call when a new match starts). */
  clear() {
    this._listeners = Object.create(null);
  }
}

export const MatchEvents = new EventEmitter();
