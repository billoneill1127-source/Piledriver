/**
 * MoveAnimator.js
 *
 * Drives per-move sprite animations in MatchScene.
 *
 * Animation sequences by category:
 *   strike / aerial:  ATTEMPT → RESET
 *   grapple / slam:   LOCK-UP → ATTEMPT → RESET
 *
 * LOCK-UP (grapple/slam only):
 *   Both wrestlers move to ring center (x=400) over 250ms, hold 150ms.
 *
 * ATTEMPT per category:
 *   strike/aerial — attacker lunges forward 30px (yoyo)
 *   slam          — attacker wind-up: step back 20px then drive forward 15px
 *   grapple       — both wrestlers nudge toward each other 10px (yoyo)
 *
 * RESET: both sprites tween back to their home positions (300ms).
 *
 * After RESET completes, emits MatchEvents 'animationComplete' and calls
 * the supplied onComplete callback so MatchScene can apply resting states.
 */

import { MatchEvents } from '../engine/MatchEvents.js';

const CENTER_X = 400;

export class MoveAnimator {
  /**
   * @param {Phaser.Scene} scene
   * @param {WrestlerSprite} p1Sprite
   * @param {WrestlerSprite} p2Sprite
   * @param {object} p1Data - wrestler data (needs .id)
   * @param {object} p2Data
   */
  constructor(scene, p1Sprite, p2Sprite, p1Data, p2Data) {
    this._scene    = scene;
    this._p1Sprite = p1Sprite;
    this._p2Sprite = p2Sprite;
    this._p1Data   = p1Data;
    this._p2Data   = p2Data;

    // Record canonical home positions at construction time (before any movement).
    this._p1Home = { x: p1Sprite._baseX, y: p1Sprite._baseY };
    this._p2Home = { x: p2Sprite._baseX, y: p2Sprite._baseY };
  }

  /**
   * Play the full animation sequence for a resolved turn result.
   *
   * @param {object}   res        - enriched TurnResult from useMatch
   * @param {function} [onComplete]
   */
  animate(res, onComplete) {
    const atkSprite = res.attackerId === this._p1Data.id ? this._p1Sprite : this._p2Sprite;
    const defSprite = res.defenderId === this._p1Data.id ? this._p1Sprite : this._p2Sprite;
    // +1 = P1 attacking right toward P2; -1 = P2 attacking left toward P1
    const dir      = res.attackerId === this._p1Data.id ? 1 : -1;
    const category = res.offMoveCategory ?? 'strike';

    const finish = () => {
      this._resetPositions(atkSprite, defSprite, () => {
        try { MatchEvents.emit('animationComplete', res); } catch (_) {}
        if (onComplete) onComplete();
      });
    };

    if (category === 'grapple' || category === 'slam') {
      this._lockUp(atkSprite, defSprite, () => {
        this._attempt(atkSprite, defSprite, dir, category, finish);
      });
    } else {
      this._attempt(atkSprite, defSprite, dir, category, finish);
    }
  }

  // ── Lock-up ───────────────────────────────────────────────────────────────

  _lockUp(atkSprite, defSprite, cb) {
    let arrived = 0;
    const onBothArrived = () => {
      if (++arrived < 2) return;
      this._scene.time.delayedCall(150, cb);
    };

    this._scene.tweens.killTweensOf(atkSprite);
    this._scene.tweens.killTweensOf(defSprite);

    this._scene.tweens.add({
      targets: atkSprite, x: CENTER_X,
      duration: 250, ease: 'Power1',
      onComplete: onBothArrived,
    });
    this._scene.tweens.add({
      targets: defSprite, x: CENTER_X,
      duration: 250, ease: 'Power1',
      onComplete: onBothArrived,
    });
  }

  // ── Attempt ───────────────────────────────────────────────────────────────

  _attempt(atkSprite, defSprite, dir, category, cb) {
    switch (category) {
      case 'slam':    this._attemptSlam(atkSprite, dir, cb);               break;
      case 'grapple': this._attemptGrapple(atkSprite, defSprite, dir, cb); break;
      default:        this._attemptStrike(atkSprite, dir, cb);             break;
    }
  }

  /** strike / aerial — step forward and back */
  _attemptStrike(atkSprite, dir, cb) {
    const startX = atkSprite.x;
    this._scene.tweens.killTweensOf(atkSprite);
    this._scene.tweens.add({
      targets:  atkSprite,
      x:        startX + dir * 30,
      duration: 150,
      ease:     'Quad.easeOut',
      yoyo:     true,
      onComplete: cb,
    });
  }

  /**
   * slam — wind-up (step back 20px) then drive forward (15px).
   * Attacker is already at center (x=400) after lock-up.
   */
  _attemptSlam(atkSprite, dir, cb) {
    const centerX = atkSprite.x;
    this._scene.tweens.killTweensOf(atkSprite);
    this._scene.tweens.add({
      targets:  atkSprite,
      x:        centerX - dir * 20,
      duration: 100,
      ease:     'Power1',
      onComplete: () => {
        this._scene.tweens.add({
          targets:  atkSprite,
          x:        centerX + dir * 15,
          duration: 150,
          ease:     'Power2',
          onComplete: cb,
        });
      },
    });
  }

  /**
   * grapple — both wrestlers nudge toward each other and back (struggle).
   * Both are already at center (x=400) after lock-up.
   */
  _attemptGrapple(atkSprite, defSprite, dir, cb) {
    const atkX = atkSprite.x;
    const defX = defSprite.x;
    let done = 0;
    const onBothDone = () => { if (++done === 2) cb(); };

    this._scene.tweens.killTweensOf(atkSprite);
    this._scene.tweens.killTweensOf(defSprite);

    this._scene.tweens.add({
      targets:  atkSprite,
      x:        atkX + dir * 10,
      duration: 100,
      ease:     'Sine.easeInOut',
      yoyo:     true,
      onComplete: onBothDone,
    });
    this._scene.tweens.add({
      targets:  defSprite,
      x:        defX - dir * 10,
      duration: 100,
      ease:     'Sine.easeInOut',
      yoyo:     true,
      onComplete: onBothDone,
    });
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  /** Tween both sprites back to their canonical home positions. */
  _resetPositions(atkSprite, defSprite, onComplete) {
    const atkHome = atkSprite === this._p1Sprite ? this._p1Home : this._p2Home;
    const defHome = defSprite === this._p1Sprite ? this._p1Home : this._p2Home;

    let done = 0;
    const onBothDone = () => { if (++done === 2 && onComplete) onComplete(); };

    this._scene.tweens.killTweensOf(atkSprite);
    this._scene.tweens.killTweensOf(defSprite);

    this._scene.tweens.add({
      targets: atkSprite, x: atkHome.x, y: atkHome.y,
      duration: 300, ease: 'Power1', onComplete: onBothDone,
    });
    this._scene.tweens.add({
      targets: defSprite, x: defHome.x, y: defHome.y,
      duration: 300, ease: 'Power1', onComplete: onBothDone,
    });
  }
}
