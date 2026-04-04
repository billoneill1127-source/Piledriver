/**
 * MoveAnimator.js
 *
 * Drives per-move sprite animations in MatchScene.
 *
 * Animation sequences by category:
 *   strike / aerial:  ATTEMPT → SETTLE
 *   grapple / slam:   LOCK-UP → ATTEMPT → SETTLE
 *
 * LOCK-UP (grapple/slam only):
 *   Both wrestlers tween to positionManager.getGrapplePoint() over 250ms,
 *   hold 150ms.
 *
 * ATTEMPT per category:
 *   strike/aerial — attacker closes to 60px of defender's current position
 *                   (200ms), then throws a 40px lunge (100ms, yoyo)
 *   slam          — attacker wind-up: step back 20px then drive forward 15px
 *   grapple       — both wrestlers nudge toward each other 10px (yoyo)
 *
 * SETTLE: PositionManager.applyResult() records new positions, then both
 *   sprites tween to those positions (300ms). Emits 'animationComplete'
 *   and calls the onComplete callback.
 */

import { MatchEvents }    from '../engine/MatchEvents.js';

export class MoveAnimator {
  /**
   * @param {Phaser.Scene}    scene
   * @param {WrestlerSprite}  p1Sprite
   * @param {WrestlerSprite}  p2Sprite
   * @param {object}          p1Data  — wrestler data (needs .id)
   * @param {object}          p2Data
   * @param {PositionManager} positionManager
   */
  constructor(scene, p1Sprite, p2Sprite, p1Data, p2Data, positionManager) {
    this._scene    = scene;
    this._p1Sprite = p1Sprite;
    this._p2Sprite = p2Sprite;
    this._p1Data   = p1Data;
    this._p2Data   = p2Data;
    this._pm       = positionManager;
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
    const dir       = res.attackerId === this._p1Data.id ? 1 : -1;
    const category  = res.offMoveCategory ?? 'strike';

    // Capture grapple point BEFORE positions are updated by applyResult
    const grappleX = this._pm.getGrapplePoint();

    const settle = () => {
      // Update position records based on move result
      this._pm.applyResult(res);
      // Tween both sprites to their new positions
      this._settleTo(atkSprite, defSprite, res, () => {
        try { MatchEvents.emit('animationComplete', res); } catch (_) {}
        if (onComplete) onComplete();
      });
    };

    if (category === 'grapple' || category === 'slam') {
      this._lockUp(atkSprite, defSprite, grappleX, () => {
        this._attempt(atkSprite, defSprite, dir, category, grappleX, settle);
      });
    } else {
      this._attempt(atkSprite, defSprite, dir, category, grappleX, settle);
    }
  }

  // ── Lock-up ───────────────────────────────────────────────────────────────

  _lockUp(atkSprite, defSprite, grappleX, cb) {
    let arrived = 0;
    const onBothArrived = () => {
      if (++arrived < 2) return;
      this._scene.time.delayedCall(150, cb);
    };

    this._scene.tweens.killTweensOf(atkSprite);
    this._scene.tweens.killTweensOf(defSprite);

    this._scene.tweens.add({
      targets: atkSprite, x: grappleX,
      duration: 250, ease: 'Power1',
      onComplete: onBothArrived,
    });
    this._scene.tweens.add({
      targets: defSprite, x: grappleX,
      duration: 250, ease: 'Power1',
      onComplete: onBothArrived,
    });
  }

  // ── Attempt ───────────────────────────────────────────────────────────────

  _attempt(atkSprite, defSprite, dir, category, grappleX, cb) {
    switch (category) {
      case 'slam':    this._attemptSlam(atkSprite, dir, cb);                     break;
      case 'grapple': this._attemptGrapple(atkSprite, defSprite, dir, cb);       break;
      default:        this._attemptStrike(atkSprite, defSprite, dir, cb);        break;
    }
  }

  /**
   * strike / aerial — attacker closes to within 60px of the defender's
   * current recorded position (200ms), then throws a 40px lunge (100ms yoyo).
   */
  _attemptStrike(atkSprite, defSprite, dir, cb) {
    const defId    = defSprite === this._p1Sprite ? this._p1Data.id : this._p2Data.id;
    const defPos   = this._pm.getPos(defId);
    const approachX = defPos.x - dir * 60;

    this._scene.tweens.killTweensOf(atkSprite);
    this._scene.tweens.add({
      targets: atkSprite, x: approachX,
      duration: 200, ease: 'Power1',
      onComplete: () => {
        this._scene.tweens.add({
          targets:  atkSprite,
          x:        approachX + dir * 40,
          duration: 100,
          ease:     'Quad.easeOut',
          yoyo:     true,
          onComplete: cb,
        });
      },
    });
  }

  /**
   * slam — wind-up (step back 20px) then drive forward (15px).
   * Attacker is already at grappleX after lock-up.
   */
  _attemptSlam(atkSprite, dir, cb) {
    const centerX = atkSprite.x; // = grappleX after lock-up
    this._scene.tweens.killTweensOf(atkSprite);
    this._scene.tweens.add({
      targets: atkSprite, x: centerX - dir * 20,
      duration: 100, ease: 'Power1',
      onComplete: () => {
        this._scene.tweens.add({
          targets: atkSprite, x: centerX + dir * 15,
          duration: 150, ease: 'Power2',
          onComplete: cb,
        });
      },
    });
  }

  /**
   * grapple — both wrestlers nudge toward each other and back (struggle).
   * Both are already at grappleX after lock-up.
   */
  _attemptGrapple(atkSprite, defSprite, dir, cb) {
    const atkX = atkSprite.x;
    const defX = defSprite.x;
    let done = 0;
    const onBothDone = () => { if (++done === 2) cb(); };

    this._scene.tweens.killTweensOf(atkSprite);
    this._scene.tweens.killTweensOf(defSprite);

    this._scene.tweens.add({
      targets: atkSprite, x: atkX + dir * 10,
      duration: 100, ease: 'Sine.easeInOut',
      yoyo: true, onComplete: onBothDone,
    });
    this._scene.tweens.add({
      targets: defSprite, x: defX - dir * 10,
      duration: 100, ease: 'Sine.easeInOut',
      yoyo: true, onComplete: onBothDone,
    });
  }

  // ── Settle ────────────────────────────────────────────────────────────────

  /**
   * Tween both sprites to their new positions as recorded by PositionManager
   * after applyResult(). This replaces the old fixed-corner reset.
   */
  _settleTo(atkSprite, defSprite, res, onComplete) {
    const atkId  = atkSprite === this._p1Sprite ? this._p1Data.id : this._p2Data.id;
    const defId  = defSprite === this._p1Sprite ? this._p1Data.id : this._p2Data.id;
    const atkPos = this._pm.getPos(atkId);
    const defPos = this._pm.getPos(defId);

    let done = 0;
    const onBothDone = () => { if (++done === 2 && onComplete) onComplete(); };

    this._scene.tweens.killTweensOf(atkSprite);
    this._scene.tweens.killTweensOf(defSprite);

    this._scene.tweens.add({
      targets: atkSprite, x: atkPos.x, y: atkPos.y,
      duration: 300, ease: 'Power1', onComplete: onBothDone,
    });
    this._scene.tweens.add({
      targets: defSprite, x: defPos.x, y: defPos.y,
      duration: 300, ease: 'Power1', onComplete: onBothDone,
    });
  }
}
