/**
 * TurnManager.js
 *
 * Orchestrates the full turn loop: pin opportunity check, move resolution,
 * damage application, submission checks, stamina recovery, and offense
 * handoff.
 *
 * Turn sequence:
 *   1. checkPinOpportunity() — if same defender is still on defense AND
 *      their stamina < 20, a pin is attempted before move selection.
 *   2. executeTurn(offenseMoveId, defenseMoveId) — resolve the exchange and
 *      return a full TurnResult.
 *
 * CPU move selection is weighted by the wrestler's brains attribute:
 *   - Defense: bias toward moves with higher min_experience requirements
 *     (more technically sophisticated options).
 *   - Offense: bias toward higher-damage moves.
 */

export class TurnManager {
  /**
   * @param {import('./MatchState.js').MatchState}         matchState
   * @param {import('./OutcomeResolver.js').OutcomeResolver} outcomeResolver
   * @param {import('./DataLoader.js').DataLoader}          dataLoader
   */
  constructor(matchState, outcomeResolver, dataLoader) {
    this.state    = matchState;
    this.resolver = outcomeResolver;
    this.data     = dataLoader;

    /**
     * Id of the defender from the PREVIOUS turn.
     * Set to null after any non-success result (offense switched).
     * Used by checkPinOpportunity to detect consecutive defense.
     * @type {string|null}
     */
    this.lastDefenderId = null;

    /** Turn counter (1-based). */
    this.turnCount = 0;
  }

  // ── Convenience ───────────────────────────────────────────────────────────

  /** @returns {object} current attacker wrestler data */
  getAttacker() { return this.data.getWrestler(this.state.offensivePlayerId); }

  /** @returns {object} current defender wrestler data */
  getDefender() { return this.data.getWrestler(this.state.defensivePlayerId); }

  // ── Pin opportunity ───────────────────────────────────────────────────────

  /**
   * Returns true if a pin attempt should be offered to the offensive player
   * before move selection this turn.
   *
   * Conditions: the same wrestler has been on defense for at least two
   * consecutive turns AND their current stamina is below 20.
   *
   * @returns {boolean}
   */
  checkPinOpportunity() {
    if (!this.lastDefenderId) return false;
    const defenderId = this.state.defensivePlayerId;
    return (
      this.lastDefenderId === defenderId &&
      this.state.getStamina(defenderId) < 20
    );
  }

  // ── Main turn execution ───────────────────────────────────────────────────

  /**
   * Execute a complete turn.
   *
   * If checkPinOpportunity() is true and the pin succeeds, the match ends
   * immediately — no move resolution occurs.
   * If the pin fails, move resolution continues normally.
   *
   * For reversals: the counter_move is executed automatically against the
   * original attacker; damage goes to them, and the defender becomes the
   * new offensive player.
   *
   * @param {string} offenseMoveId
   * @param {string} defenseMoveId
   * @returns {TurnResult}
   *
   * @typedef {object} TurnResult
   * @property {'success'|'escape'|'block'|'reversal'|null} result
   * @property {number}  damage             — stamina removed from the target
   * @property {string}  newOffensivePlayer — id of who attacks next
   * @property {boolean} matchOver
   * @property {string|null} winner         — wrestler id, or null
   * @property {boolean} pinOffered
   * @property {boolean|null} pinResult     — true = pin succeeded
   * @property {boolean|null} submissionResult — true = submitted
   * @property {boolean} staminaRecovered   — true if +5 stamina was granted
   */
  executeTurn(offenseMoveId, defenseMoveId) {
    const attacker = this.getAttacker();
    const defender = this.getDefender();
    this.turnCount++;

    // ── Step 1: Pin opportunity ─────────────────────────────────────────────
    const pinOffered = this.checkPinOpportunity();
    if (pinOffered) {
      const pinSucceeded = this.state.checkPin(defender);
      if (pinSucceeded) {
        return {
          result: null,
          damage: 0,
          newOffensivePlayer: attacker.id,
          matchOver: true,
          winner: attacker.id,
          pinOffered: true,
          pinResult: true,
          submissionResult: null,
          staminaRecovered: false,
        };
      }
      // Pin failed — fall through to move resolution
    }

    // ── Step 2: Resolve move exchange ──────────────────────────────────────
    const offenseMove = this.data.getMove(offenseMoveId);
    const { result, reversalMoveId } = this.resolver.resolveTurn(
      offenseMoveId, defenseMoveId, attacker, defender,
    );

    // ── Step 3: Determine who takes damage ─────────────────────────────────
    // Reversal: counter_move lands on the original attacker instead.
    const isReversal    = result === 'reversal' && reversalMoveId;
    const damagedMove   = isReversal ? this.data.getMove(reversalMoveId) : offenseMove;
    const damageTarget  = isReversal ? attacker : defender;
    const damage        = (result === 'success' || isReversal) ? (damagedMove?.damage ?? 0) : 0;

    this.state.applyDamage(damageTarget.id, damage);

    // ── Step 4: Submission check ────────────────────────────────────────────
    // Only when a successful submission move lands on the original defender.
    let submissionResult = null;
    if (result === 'success' && offenseMove?.is_submission) {
      submissionResult = this.state.checkSubmission(attacker, defender);
      if (submissionResult) {
        this.lastDefenderId = null;
        return {
          result,
          damage,
          newOffensivePlayer: attacker.id,
          matchOver: true,
          winner: attacker.id,
          pinOffered,
          pinResult: pinOffered ? false : null,
          submissionResult: true,
          staminaRecovered: false,
        };
      }
    }

    // ── Step 5: Check stamina KO ────────────────────────────────────────────
    const koWinner = this.state.isMatchOver();
    if (koWinner) {
      this.lastDefenderId = null;
      return {
        result,
        damage,
        newOffensivePlayer: this.state.offensivePlayerId,
        matchOver: true,
        winner: koWinner,
        pinOffered,
        pinResult: pinOffered ? false : null,
        submissionResult,
        staminaRecovered: false,
      };
    }

    // ── Step 6: Stamina recovery and offense handoff ────────────────────────
    let staminaRecovered = false;

    if (result === 'success') {
      // Attacker stays on offense; recovers 5 stamina (capped at starting value)
      this.state.addStamina(attacker.id, 5);
      staminaRecovered  = true;
      this.lastDefenderId = defender.id; // same defender stays — pin may trigger next turn
    } else {
      // escape | block | reversal — defense becomes the new offense
      this.state.swapOffense();
      this.lastDefenderId = null; // defender changed; reset pin opportunity
    }

    return {
      result,
      damage,
      newOffensivePlayer: this.state.offensivePlayerId,
      matchOver: false,
      winner: null,
      pinOffered,
      pinResult: pinOffered ? false : null,
      submissionResult,
      staminaRecovered,
    };
  }

  // ── CPU move selection ────────────────────────────────────────────────────

  /**
   * CPU selects a defense move.
   * Weighted by brains: higher-brains wrestlers prefer more sophisticated
   * moves (those with higher min_experience requirements).
   *
   * @param {object} wrestler
   * @returns {string} move id
   */
  cpuSelectDefense(wrestler) {
    const available = this.data.getAvailableMoves(wrestler, 'Defense');
    if (!available.length) return 'retreat';
    return this._weightedPick(
      available,
      m => 1 + (m.requirements.min_experience / 100) * (wrestler.attrs.brains / 50),
    );
  }

  /**
   * CPU selects an offense move.
   * Weighted by brains: higher-brains wrestlers bias toward higher-damage moves.
   *
   * @param {object} wrestler
   * @returns {string} move id
   */
  cpuSelectOffense(wrestler) {
    const available = this.data.getAvailableMoves(wrestler, 'Offense');
    if (!available.length) return 'punch';
    return this._weightedPick(
      available,
      m => 1 + (m.damage / 20) * (wrestler.attrs.brains / 50),
    );
  }

  /**
   * Weighted random pick from an array using a weight function.
   * @template T
   * @param {T[]} items
   * @param {function(T): number} weightFn
   * @returns {string} selected item's .id
   */
  _weightedPick(items, weightFn) {
    const weights = items.map(weightFn);
    const total   = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i].id;
    }
    return items[items.length - 1].id;
  }
}
