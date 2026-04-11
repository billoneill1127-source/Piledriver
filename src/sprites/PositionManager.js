/**
 * PositionManager.js
 *
 * Tracks the current ring positions of both wrestlers and updates them
 * after each move based on the result. MoveAnimator reads from here to
 * know where to send sprites after an animation, replacing the old fixed
 * home-corner system.
 *
 * Ring bounds (inner rope area):
 *   x: 120 – 680   (rope at 102 / 698, small inset buffer)
 *   y: 452          (mat level, fixed — only x changes)
 *
 * Per-wrestler x clamps (adjusted for 4.5× sprite scale ≈ 144px wide):
 *   P1: 144 – 420   (can't cross ring center)
 *   P2: 380 – 656   (same, mirrored)
 *
 * Minimum gap between wrestlers: 80 px.
 */

const P1_START = 230;
const P2_START = 570;
const MAT_Y    = 452;

const RING_LEFT  = 120;
const RING_RIGHT = 680;

// Per-wrestler x limits
const P1_MIN_X = 144;
const P1_MAX_X = 420;
const P2_MIN_X = 380;
const P2_MAX_X = 656;

const MIN_GAP      = 80;
const GRAPPLE_MIN  = 320;
const GRAPPLE_MAX  = 480;

export class PositionManager {
  /**
   * @param {string} p1Id
   * @param {string} p2Id
   */
  constructor(p1Id, p2Id) {
    this._p1Id = p1Id;
    this._p2Id = p2Id;

    this.ringBounds = { left: RING_LEFT, right: RING_RIGHT, y: MAT_Y };
    this.p1Pos = { x: P1_START, y: MAT_Y };
    this.p2Pos = { x: P2_START, y: MAT_Y };
  }

  // ── Public reads ─────────────────────────────────────────────────────────

  /** @returns {{ x: number, y: number }} */
  getPos(wrestlerId) {
    return wrestlerId === this._p1Id
      ? { ...this.p1Pos }
      : { ...this.p2Pos };
  }

  /** Midpoint between both wrestlers' current x positions. */
  getMidpoint() {
    return (this.p1Pos.x + this.p2Pos.x) / 2;
  }

  /**
   * Where both wrestlers converge for a grapple/slam lock-up.
   * Returns the midpoint clamped to the center grapple zone (320-480).
   */
  getGrapplePoint() {
    return Math.max(GRAPPLE_MIN, Math.min(GRAPPLE_MAX, this.getMidpoint()));
  }

  /** Pixel distance between current positions. */
  getDistanceBetween() {
    return Math.abs(this.p2Pos.x - this.p1Pos.x);
  }

  // ── Match lifecycle ───────────────────────────────────────────────────────

  /** Snap both wrestlers back to starting corners (match start / rematch). */
  resetToCorners() {
    this.p1Pos = { x: P1_START, y: MAT_Y };
    this.p2Pos = { x: P2_START, y: MAT_Y };
  }

  // ── Position update ───────────────────────────────────────────────────────

  /**
   * Apply post-move position rules from a resolved turn result.
   * Called by MoveAnimator before the reset tween so sprites land at the
   * correct new positions.
   *
   * @param {object} res - enriched TurnResult (needs attackerId, defenderId,
   *                       result, offMoveCategory, defenseMoveId)
   */
  applyResult(res) {
    const isP1Atk  = res.attackerId === this._p1Id;
    const dir      = isP1Atk ? 1 : -1;  // +1 = P1 moving right, -1 = P2 moving left
    const grappleX = this.getGrapplePoint();

    const atkPos = this.getPos(res.attackerId);
    const defPos = this.getPos(res.defenderId);

    let newAtkX = atkPos.x;
    let newDefX = defPos.x;

    const category = res.offMoveCategory ?? 'strike';

    // ── Retreat: defender returns to their corner regardless of outcome ──
    if (res.defenseMoveId === 'retreat') {
      newDefX = res.defenderId === this._p1Id ? P1_START : P2_START;
      // Attacker stays at their current position
      newAtkX = atkPos.x;
    } else {
      // ── Category + result rules ──────────────────────────────────────
      switch (category) {
        case 'strike':
        case 'aerial':
          this._applyStrike(res.result, dir, atkPos, defPos, grappleX,
            (ax, dx) => { newAtkX = ax; newDefX = dx; });
          break;

        case 'grapple':
          this._applyGrapple(res.result, dir, grappleX,
            (ax, dx) => { newAtkX = ax; newDefX = dx; });
          break;

        case 'slam':
          this._applySlam(res.result, dir, grappleX,
            (ax, dx) => { newAtkX = ax; newDefX = dx; });
          break;

        default:
          // Unknown category — no position change
          break;
      }
    }

    // Write new positions (clamped per wrestler, then gap-enforced)
    this._setRaw(res.attackerId, newAtkX);
    this._setRaw(res.defenderId, newDefX);
    this._enforceGap();
  }

  // ── Category handlers ─────────────────────────────────────────────────────

  _applyStrike(result, dir, atkPos, defPos, _grappleX, out) {
    switch (result) {
      case 'success':
        // Attacker stays at close range; defender stays
        out(defPos.x - dir * 80, defPos.x);
        break;
      case 'escape':
        // Defender moves away; attacker holds position
        out(atkPos.x, defPos.x + dir * 60);
        break;
      case 'block':
        // Attacker bounced back to ~100px from defender; defender stays
        out(defPos.x - dir * 100, defPos.x);
        break;
      case 'reversal':
        // Swap positions
        out(defPos.x, atkPos.x);
        break;
      default:
        out(atkPos.x, defPos.x);
    }
  }

  _applyGrapple(result, dir, grappleX, out) {
    // Both wrestlers are at grappleX after the lock-up
    switch (result) {
      case 'success':
        // Both stay at grapple point; gap enforcement separates them
        out(grappleX, grappleX);
        break;
      case 'escape':
        // Defender breaks and moves away; attacker stays at center
        out(grappleX, grappleX + dir * 80);
        break;
      case 'block':
        // Attacker pushed back; defender stays at center
        out(grappleX - dir * 60, grappleX);
        break;
      case 'reversal':
        // Swap sides around the grapple point
        out(grappleX + dir * 40, grappleX - dir * 40);
        break;
      default:
        out(grappleX, grappleX);
    }
  }

  _applySlam(result, dir, grappleX, out) {
    switch (result) {
      case 'success':
        // Defender planted at center; attacker stays near center
        out(400 - dir * 60, 400);
        break;
      case 'escape':
        // Defender sidesteps away; attacker stumbles to center
        out(grappleX, grappleX + dir * 70);
        break;
      case 'block':
        // Attacker bounced back from grapple point; defender stays
        out(grappleX - dir * 70, grappleX);
        break;
      case 'reversal':
        // Swap sides
        out(grappleX + dir * 40, grappleX - dir * 40);
        break;
      default:
        out(grappleX, grappleX);
    }
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  /** Write raw x for a single wrestler, clamped to their ring bounds. */
  _setRaw(wrestlerId, x) {
    if (wrestlerId === this._p1Id) {
      this.p1Pos.x = Math.max(P1_MIN_X, Math.min(P1_MAX_X, x));
    } else {
      this.p2Pos.x = Math.max(P2_MIN_X, Math.min(P2_MAX_X, x));
    }
  }

  /** Push wrestlers apart if they are closer than MIN_GAP. */
  _enforceGap() {
    const gap = this.p2Pos.x - this.p1Pos.x;
    if (gap < MIN_GAP) {
      const mid = (this.p1Pos.x + this.p2Pos.x) / 2;
      this.p1Pos.x = Math.max(P1_MIN_X, Math.min(P1_MAX_X, Math.round(mid - MIN_GAP / 2)));
      this.p2Pos.x = Math.max(P2_MIN_X, Math.min(P2_MAX_X, Math.round(mid + MIN_GAP / 2)));
    }
  }
}
