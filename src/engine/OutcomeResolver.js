/**
 * OutcomeResolver.js
 *
 * Resolves a move attempt into one of four outcomes using the outcomes table
 * and wrestler attribute adjustments.
 *
 * Attribute adjustment:
 *   offAttr - defAttr (both on a 0-100 scale) → delta scaled by 0.001
 *   Positive delta nudges success probability up; negative nudges it down.
 *   Non-success outcomes are renormalized so probabilities always sum to 1.
 */

export class OutcomeResolver {
  /**
   * @param {import('./DataLoader.js').DataLoader} dataLoader
   */
  constructor(dataLoader) {
    this.data = dataLoader;
  }

  // ── Public ────────────────────────────────────────────────────────────────

  /**
   * Resolve a single turn exchange.
   *
   * @param {string} offenseMoveId
   * @param {string} defenseMoveId
   * @param {object} attacker - wrestler data (with .attrs)
   * @param {object} defender - wrestler data (with .attrs)
   * @returns {{ result: 'success'|'escape'|'block'|'reversal', reversalMoveId: string|null }}
   */
  resolveTurn(offenseMoveId, defenseMoveId, attacker, defender) {
    const offenseMove = this.data.getMove(offenseMoveId);
    const baseProbs   = this.data.getOutcomes(offenseMoveId, defenseMoveId);

    if (!baseProbs) {
      // No table entry (e.g. back_body_drop) — default: attacker succeeds
      return { result: 'success', reversalMoveId: null };
    }

    // Apply attribute adjustment to produce final probabilities
    const finalProbs = this._adjustProbabilities(baseProbs, offenseMove, attacker, defender);

    // Weighted random draw
    const result = this._roll(finalProbs);

    // Reversal triggers the offense move's counter_move automatically
    const reversalMoveId = (result === 'reversal')
      ? (offenseMove?.counter_move ?? null)
      : null;

    return { result, reversalMoveId };
  }

  // ── Private ───────────────────────────────────────────────────────────────

  /**
   * Nudge success probability by an attr-derived delta, then renormalize the
   * full distribution so it sums to 1.
   *
   * @param {{ success, escape, block, reversal }} probs
   * @param {object|null} offenseMove
   * @param {object} attacker
   * @param {object} defender
   * @returns {{ success, escape, block, reversal }}
   */
  _adjustProbabilities(probs, offenseMove, attacker, defender) {
    // attr names in moves.json are capitalized ("Speed") but wrestler attrs are lowercase
    const offAttrName = offenseMove?.adjust_by_offense_attr?.toLowerCase();
    const defAttrName = offenseMove?.adjust_by_defense_attr?.toLowerCase();

    let delta = 0;
    if (offAttrName && defAttrName) {
      const offVal = attacker.attrs[offAttrName] ?? 50;
      const defVal = defender.attrs[defAttrName] ?? 50;
      delta = (offVal - defVal) * 0.001; // ±0.08 max across the full attr range
    }

    // Clamp adjusted success to [0, 1]
    const clamp = (v) => Math.max(0, Math.min(1, v));
    const newSuccess   = clamp(probs.success + delta);
    const actualDelta  = newSuccess - probs.success;

    // Redistribute the delta proportionally across non-success outcomes
    const nonSuccessBase = probs.escape + probs.block + probs.reversal;
    let escape   = probs.escape;
    let block    = probs.block;
    let reversal = probs.reversal;

    if (nonSuccessBase > 0) {
      // Scale non-success outcomes inversely to the success shift
      const scale = 1 - actualDelta / nonSuccessBase;
      escape   = clamp(probs.escape   * scale);
      block    = clamp(probs.block    * scale);
      reversal = clamp(probs.reversal * scale);
    }

    // Renormalize to guarantee sum === 1 (guards against float drift)
    const total = newSuccess + escape + block + reversal;
    if (total === 0) return probs; // degenerate — return original
    return {
      success:  newSuccess / total,
      escape:   escape     / total,
      block:    block      / total,
      reversal: reversal   / total,
    };
  }

  /**
   * Weighted random draw over the four outcomes.
   * @param {{ success, escape, block, reversal }} probs
   * @returns {'success'|'escape'|'block'|'reversal'}
   */
  _roll(probs) {
    const r = Math.random();
    let cum = 0;
    for (const key of ['success', 'escape', 'block', 'reversal']) {
      cum += probs[key] || 0;
      if (r < cum) return key;
    }
    return 'success'; // float rounding fallback
  }
}
