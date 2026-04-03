/**
 * MatchState.js
 *
 * Tracks mutable match state: current stamina for each wrestler, who is on
 * offense, and provides pin/submission resolution.
 *
 * Pin check:
 *   pinDefense = currentStamina + toughness
 *   kickoutChance = min(1, pinDefense / 100)
 *   Random roll > kickoutChance → pin succeeds (defender fails to kick out)
 *
 * Submission check (single check):
 *   escapeChance = min(1, (currentStamina + toughness) / 100)
 *   Random roll < escapeChance → escape; otherwise → tap out
 *
 * Submission check (double check — attacker brains > defender brains):
 *   Defender must pass BOTH independent rolls to escape.
 *   Failing either → submission.
 */

export class MatchState {
  /**
   * @param {object} wrestler1 - full wrestler data object (with .id, .attrs)
   * @param {object} wrestler2
   */
  constructor(wrestler1, wrestler2) {
    /** Starting stamina cap per wrestler (for addStamina ceiling). */
    this._startStamina = {
      [wrestler1.id]: wrestler1.attrs.stamina,
      [wrestler2.id]: wrestler2.attrs.stamina,
    };

    /** Current stamina for each wrestler. */
    this.stamina = {
      [wrestler1.id]: wrestler1.attrs.stamina,
      [wrestler2.id]: wrestler2.attrs.stamina,
    };

    /** Raw wrestler data (for attr lookups). */
    this._wrestlers = {
      [wrestler1.id]: wrestler1,
      [wrestler2.id]: wrestler2,
    };

    /** Id of the wrestler currently on offense. */
    this.offensivePlayerId = wrestler1.id;

    /** Id of the wrestler currently on defense. */
    this.defensivePlayerId = wrestler2.id;
  }

  // ── Stamina ───────────────────────────────────────────────────────────────

  /** @returns {number} current stamina for the given wrestler */
  getStamina(wrestlerId) {
    return this.stamina[wrestlerId];
  }

  /**
   * Reduce a wrestler's stamina, floored at 0.
   * @param {string} wrestlerId
   * @param {number} amount
   */
  applyDamage(wrestlerId, amount) {
    this.stamina[wrestlerId] = Math.max(0, this.stamina[wrestlerId] - amount);
  }

  /**
   * Restore stamina to the offensive wrestler after a successful move.
   * Capped at that wrestler's starting stamina.
   * @param {string} wrestlerId
   * @param {number} amount
   */
  addStamina(wrestlerId, amount) {
    const cap = this._startStamina[wrestlerId];
    this.stamina[wrestlerId] = Math.min(cap, this.stamina[wrestlerId] + amount);
  }

  // ── Offense control ───────────────────────────────────────────────────────

  /** Swap who is on offense and defense. */
  swapOffense() {
    [this.offensivePlayerId, this.defensivePlayerId] =
      [this.defensivePlayerId, this.offensivePlayerId];
  }

  // ── Pin ───────────────────────────────────────────────────────────────────

  /**
   * Attempt a pin on the defender.
   * Returns true if the pin SUCCEEDS (defender fails to kick out → match over).
   *
   * @param {object} defender - wrestler data object (with .attrs.toughness)
   * @returns {boolean}
   */
  checkPin(defender) {
    const currentStamina = this.stamina[defender.id];
    const pinDefense     = currentStamina + defender.attrs.toughness;
    const kickoutChance  = Math.min(1, pinDefense / 100);
    return Math.random() > kickoutChance; // true = defender failed to kick out
  }

  // ── Submission ────────────────────────────────────────────────────────────

  /**
   * Check whether a submission hold forces a tap out.
   * Damage is applied separately — call this AFTER applyDamage.
   * Returns true if the defender SUBMITS (match over).
   *
   * @param {object} attacker - wrestler data object (with .attrs.brains)
   * @param {object} defender
   * @returns {boolean}
   */
  checkSubmission(attacker, defender) {
    const currentStamina = this.stamina[defender.id];
    const escapeValue    = currentStamina + defender.attrs.toughness;
    const escapeChance   = Math.min(1, escapeValue / 100);

    const doubleCheck = attacker.attrs.brains > defender.attrs.brains;

    if (doubleCheck) {
      // Defender must pass BOTH checks independently to escape
      const pass1 = Math.random() < escapeChance;
      const pass2 = Math.random() < escapeChance;
      return !(pass1 && pass2); // true = submitted
    }

    return Math.random() >= escapeChance; // true = submitted
  }

  // ── Match end ─────────────────────────────────────────────────────────────

  /**
   * Returns the winner's id if either wrestler is at 0 stamina, otherwise null.
   * If both somehow reach 0 simultaneously, the offensive player wins
   * (the one who dealt the final blow).
   *
   * @returns {string|null}
   */
  isMatchOver() {
    const ids = Object.keys(this.stamina);
    for (const id of ids) {
      if (this.stamina[id] <= 0) {
        // This wrestler is out — the other one wins
        return ids.find(i => i !== id);
      }
    }
    return null;
  }
}
