/**
 * WrestlerSprite.js
 *
 * Phaser.GameObjects.Sprite subclass that plays hand-crafted pixel art
 * animations from Aseprite-exported sprite sheets.
 *
 * Origin is at bottom-center (0.5, 1) so the y coordinate always
 * represents the wrestler's feet on the mat — matching PositionManager.
 *
 * Usage:
 *   const sprite = new WrestlerSprite(scene, x, matY, wrestlerData, 'right');
 *   scene.add.existing(sprite);
 *   sprite.setState('hit');
 */

import Phaser from 'phaser';

const FRAME_H = 32;
const SCALE   = 3;

export class WrestlerSprite extends Phaser.GameObjects.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x         — horizontal center
   * @param {number} y         — mat contact point (feet level)
   * @param {object} wrestler  — full wrestler data object from wrestlers.json
   * @param {'left'|'right'} facing
   */
  constructor(scene, x, y, wrestler, facing = 'right') {
    super(scene, x, y, wrestler.id, 0);

    this._wrestler = wrestler;
    this._facing   = facing;
    this._state    = 'idle';
    this._baseX    = x;
    this._baseY    = y;

    // Exposed so MatchScene can position name labels above the sprite
    this._spriteH = FRAME_H * SCALE;

    this.setOrigin(0.5, 1);
    this.setScale(SCALE);

    // P2 faces left
    if (facing === 'left') this.setFlipX(true);

    this.play(`${wrestler.id}_Idle`);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Transition to a new animation state.
   * @param {string} state
   * @returns {this}
   */
  setState(state) {
    if (this._state === state) return this;
    this._state = state;

    // Clear any pending on-complete callbacks from the previous animation
    this.off('animationcomplete');

    const id = this._wrestler.id;

    switch (state) {
      case 'idle':
        this.anims.setTimeScale(1);
        this.play(`${id}_Idle`);
        break;

      case 'strike':
        this.anims.setTimeScale(1);
        this.play(`${id}_Strike`);
        this.once('animationcomplete', () => {
          if (this._state === 'strike') this.setState('idle');
        });
        break;

      case 'hit':
        this.anims.setTimeScale(1);
        this.play(`${id}_Hit Reaction`);
        this.once('animationcomplete', () => {
          if (this._state === 'hit') this.setState('idle');
        });
        break;

      case 'down':
        // Play Down animation once and hold the last frame
        this.anims.setTimeScale(1);
        this.play(`${id}_Down`);
        break;

      case 'grounded':
        // Same as down — wrestler is on the mat
        this.anims.setTimeScale(1);
        this.play(`${id}_Down`);
        break;

      case 'stunned':
        // Slow idle bob (dazed) at half speed
        this.play(`${id}_Idle`);
        this.anims.setTimeScale(0.5);
        break;

      case 'victory':
        this.anims.setTimeScale(1);
        this.play(`${id}_Victory`);
        break;

      case 'celebrate':
        // Victory animation at 150% speed for extra exuberance
        this.play(`${id}_Victory`);
        this.anims.setTimeScale(1.5);
        break;

      default:
        this.anims.setTimeScale(1);
        this.play(`${id}_Idle`);
        break;
    }

    return this; // chainable
  }
}
