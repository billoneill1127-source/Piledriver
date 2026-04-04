/**
 * WrestlerSprite.js
 *
 * Phaser.GameObjects.Container subclass that renders a 16-bit style wrestler
 * sprite using Phaser Graphics objects. Origin is at the wrestler's feet
 * (bottom-center), matching the mat-contact point used in MatchScene.
 *
 * Usage:
 *   const sprite = new WrestlerSprite(scene, x, matY, wrestlerData, 'right');
 *   scene.add.existing(sprite);
 *   sprite.setState('hit');
 */

import Phaser from 'phaser';
import { drawWrestler, computeSize } from './drawWrestler.js';

export class WrestlerSprite extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x         — horizontal center
   * @param {number} y         — mat contact point (feet level)
   * @param {object} wrestler  — full wrestler data object from wrestlers.json
   * @param {'left'|'right'} facing
   */
  constructor(scene, x, y, wrestler, facing = 'right') {
    super(scene, x, y);

    this._wrestler = wrestler;
    this._facing   = facing;
    this._state    = 'idle';
    this._baseX    = x;
    this._baseY    = y;
    this._tweens   = [];

    const { w, h } = computeSize(wrestler);
    this._spriteW = w;
    this._spriteH = h;

    // Main graphics layer — offset so container origin = bottom-center
    this._gfx = scene.add.graphics();
    this._gfx.setPosition(-Math.round(w / 2), -h);
    this.add(this._gfx);

    // Hit-flash overlay (white, normally invisible)
    this._flashGfx = scene.add.graphics();
    this._flashGfx.setPosition(-Math.round(w / 2), -h);
    this._flashGfx.setAlpha(0);
    this.add(this._flashGfx);

    // Mirror for left-facing wrestlers
    if (facing === 'left') this.setScale(-1, 1);

    this._draw('idle');
    this._startIdle();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Transition to a new animation state. */
  setState(state) {
    if (this._state === state) return;
    this._state = state;
    this._clearTweens();
    this._resetTransform();

    this._draw(state);

    switch (state) {
      case 'idle':      this._startIdle();      break;
      case 'hit':       this._startHit();       break;
      case 'down':      this._startDown();      break;
      case 'stunned':   this._startStunned();   break;
      case 'grounded':  this._startGrounded();  break;
      case 'victory':   this._startVictory();   break;
      case 'celebrate': this._startCelebrate(); break;
      default:          this._startIdle();
    }
    return this; // chainable
  }

  // ── Drawing ────────────────────────────────────────────────────────────────

  _draw(state) {
    const gfx = this._gfx;
    gfx.clear();
    const isVictory   = state === 'victory' || state === 'celebrate';
    const isSmiling   = isVictory;
    drawWrestler(gfx, this._wrestler, {
      width:   this._spriteW,
      height:  this._spriteH,
      victory: isVictory,
      smile:   isSmiling,
    });
  }

  _drawFlash() {
    const gfx = this._flashGfx;
    if (!gfx?.active) return;
    gfx.clear();
    // Draw a solid white silhouette: fill every rect/circle in white by
    // temporarily overriding fillStyle calls through a shim.
    const origFillStyle = gfx.fillStyle.bind(gfx);
    gfx.fillStyle = () => origFillStyle(0xffffff, 1);
    drawWrestler(gfx, this._wrestler, { width: this._spriteW, height: this._spriteH });
    gfx.fillStyle = origFillStyle;
  }

  // ── Transform helpers ──────────────────────────────────────────────────────

  _resetTransform() {
    this.y      = this._baseY;
    this.angle  = 0;
    this._flashGfx.setAlpha(0);
    this._flashGfx.clear();
  }

  _clearTweens() {
    // killTweensOf is the reliable API — avoids isPlaying() which doesn't
    // exist in Phaser 3.90 and caused the tween accumulation crash.
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.killTweensOf(this._flashGfx);
    this._tweens = [];
  }

  _addTween(config) {
    const t = this.scene.tweens.add({ targets: this, ...config });
    this._tweens.push(t);
    return t;
  }

  // ── Animation states ───────────────────────────────────────────────────────

  _startIdle() {
    // Gentle vertical bob ±3 px, 800 ms
    this._addTween({
      y:        this._baseY - 3,
      duration: 800,
      ease:     'Sine.easeInOut',
      yoyo:     true,
      repeat:   -1,
    });
  }

  _startHit() {
    this._drawFlash();
    if (this._flashGfx?.active) this._flashGfx.setAlpha(1);
    // Fade out the flash overlay, then return to idle
    this._addTween({
      targets:    this._flashGfx,
      alpha:      0,
      duration:   200,
      ease:       'Linear',
      onComplete: () => {
        if (this._flashGfx?.active) this._flashGfx.clear();
        if (this._state === 'hit') {
          this._state = 'idle';
          this._startIdle();
        }
      },
    });
  }

  _startDown() {
    // Tip over to 90° — direction depends on facing so the sprite falls away
    const targetAngle = this._facing === 'right' ? 90 : -90;
    // Move origin so feet go down while body tips horizontally
    this._addTween({
      angle:    targetAngle,
      y:        this._baseY - Math.round(this._spriteW / 2),
      duration: 400,
      ease:     'Quad.easeIn',
    });
  }

  _startStunned() {
    // Lean forward toward center of ring — positive for right-facing, negative for left
    this.angle = this._facing === 'right' ? 9 : -9;
    // Slower, deeper bob: 4px over 1200ms (wobbly, dazed)
    this._addTween({
      y:        this._baseY - 4,
      duration: 1200,
      ease:     'Sine.easeInOut',
      yoyo:     true,
      repeat:   -1,
    });
  }

  _startGrounded() {
    // Same fall as 'down' — holds on the mat until next animation clears it
    const targetAngle = this._facing === 'right' ? 90 : -90;
    this._addTween({
      angle:    targetAngle,
      y:        this._baseY - Math.round(this._spriteW / 2),
      duration: 400,
      ease:     'Quad.easeIn',
    });
  }

  _startVictory() {
    // Slow vertical bob while arms are raised
    this._addTween({
      y:        this._baseY - 5,
      duration: 600,
      ease:     'Sine.easeInOut',
      yoyo:     true,
      repeat:   -1,
    });
  }

  _startCelebrate() {
    // Arms raised (victory pose) + exuberant bounce: jump 8px, repeat twice fast,
    // then settle into a slower victory bob
    this.scene.tweens.add({
      targets:  this,
      y:        this._baseY - 8,
      duration: 200,
      ease:     'Quad.easeOut',
      yoyo:     true,
      repeat:   2,
      onComplete: () => {
        if (this._state !== 'celebrate' || !this.active) return;
        this._addTween({
          y:        this._baseY - 4,
          duration: 600,
          ease:     'Sine.easeInOut',
          yoyo:     true,
          repeat:   -1,
        });
      },
    });
  }
}
