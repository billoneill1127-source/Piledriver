import Phaser from 'phaser';
import { MatchEvents }     from '../engine/MatchEvents.js';
import { WrestlerSprite }  from '../sprites/WrestlerSprite.js';
import { MoveAnimator }    from '../sprites/MoveAnimator.js';
import { PositionManager } from '../sprites/PositionManager.js';

const WRESTLERS = [
  'bulk_bogan',
  'el_aguilia_blanca',
  'mike_milkman',
  'nick_olympia',
  'tank_thompson',
];

const ANIMS = [
  { tag: 'Idle',         start: 0,  end: 2,  frameRate: 4,  repeat: -1 },
  { tag: 'Strike',       start: 3,  end: 5,  frameRate: 8,  repeat: 0  },
  { tag: 'Hit Reaction', start: 6,  end: 8,  frameRate: 7,  repeat: 0  },
  { tag: 'Down',         start: 9,  end: 11, frameRate: 4,  repeat: 0  },
  { tag: 'Victory',      start: 12, end: 14, frameRate: 4,  repeat: -1 },
];

/**
 * Factory that closes over wrestler data so the scene doesn't rely on
 * Phaser's scene-data mechanism.
 */
export function createMatchScene(p1Data, p2Data) {
  return class MatchScene extends Phaser.Scene {
    constructor() {
      super({ key: 'MatchScene' });
    }

    preload() {
      const base = import.meta.env.BASE_URL;
      WRESTLERS.forEach(id => {
        this.load.spritesheet(id,
          `${base}sprites/${id}.png`,
          { frameWidth: 32, frameHeight: 32 }
        );
        this.load.json(`${id}_data`, `${base}sprites/${id}.json`);
      });
    }

    create() {
      // ── Phaser animations (25 total: 5 wrestlers × 5 tags) ───────────────
      WRESTLERS.forEach(id => {
        ANIMS.forEach(({ tag, start, end, frameRate, repeat }) => {
          this.anims.create({
            key:       `${id}_${tag}`,
            frames:    this.anims.generateFrameNumbers(id, { start, end }),
            frameRate,
            repeat,
          });
        });
      });

      // ── Ring background ─────────────────────────────────────────────────
      // MAT_BOTTOM = 356 (raised 96px vs old 452 — gives front-facing perspective).
      // Front face (y=356–452) is the visible apron face below the mat edge.
      this.add.rectangle(400, 300, 800, 600, 0x0d0d1a);
      // Outer apron: back strip + side borders + front face (y≈127–452)
      this.add.rectangle(400, 290, 660, 325, 0x4a2e10);
      // Mat surface (y=172–356)
      this.add.rectangle(400, 264, 596, 184, 0xc8b896);
      // Front face shading — darker than apron to sell depth
      this.add.rectangle(400, 404, 596, 96, 0x2e1b08);

      // ── Ropes and posts ─────────────────────────────────────────────────
      const g = this.add.graphics();
      const RL = 102, RR = 698;

      g.lineStyle(3, 0xf0d070, 1);
      [145, 158, 172].forEach(y => g.lineBetween(RL, y, RR, y)); // back ropes
      [330, 343, 356].forEach(y => g.lineBetween(RL, y, RR, y)); // front ropes

      g.lineStyle(3, 0xf0d070, 0.5);
      g.lineBetween(RL, 145, RL, 330); // left side
      g.lineBetween(RR, 145, RR, 330); // right side

      g.fillStyle(0x8b6914, 1);
      [[RL, 145], [RR, 145], [RL, 330], [RR, 330]].forEach(([x, y]) => {
        g.fillRect(x - 7, y - 7, 14, 14);
      });

      // ── Wrestler sprites ─────────────────────────────────────────────────
      const MAT_BOTTOM = 356;
      const P1_X = 230, P2_X = 570;

      this.p1Sprite = new WrestlerSprite(this, P1_X, MAT_BOTTOM, p1Data, 'right');
      this.p2Sprite = new WrestlerSprite(this, P2_X, MAT_BOTTOM, p2Data, 'left');
      this.add.existing(this.p1Sprite);
      this.add.existing(this.p2Sprite);

      this._posMgr  = new PositionManager(p1Data.id, p2Data.id);
      this._posMgr.resetToCorners(); // ensure clean start
      this._animator = new MoveAnimator(
        this, this.p1Sprite, this.p2Sprite, p1Data, p2Data, this._posMgr,
      );

      // ── Stamina cache (updated by 'stamina' event) ───────────────────────
      this._lastStamina = { [p1Data.id]: Infinity, [p2Data.id]: Infinity };

      // ── MatchEvents listeners ─────────────────────────────────────────────
      // All callbacks are wrapped in try/catch so any Phaser error is logged
      // here and does NOT propagate up into React's event loop (which would
      // unmount the entire app and produce a white screen).

      const unsubStamina = MatchEvents.on('stamina', (vals) => {
        try {
          this._lastStamina = vals;
          // Safety net: if a wrestler's stamina drops into pin range while
          // they're still in idle, force them visually grounded.
          [
            { id: p1Data.id, sprite: this.p1Sprite },
            { id: p2Data.id, sprite: this.p2Sprite },
          ].forEach(({ id, sprite }) => {
            if ((vals[id] ?? Infinity) < 20 && sprite?.active && sprite._state === 'idle') {
              sprite.setAnimState('grounded');
            }
          });
        } catch (err) {
          console.error('[MatchScene] stamina handler threw:', err);
        }
      });

      const unsubDamage = MatchEvents.on('damage', () => {
        // Animation handled by MoveAnimator at point of impact
      });

      const unsubTurnResult = MatchEvents.on('turnResult', (res) => {
        try {
          this._animator.animate(res, () => {
            try { this._applyRestingStates(res); }
            catch (err) { console.error('[MatchScene] _applyRestingStates threw:', err); }
          });
        } catch (err) {
          console.error('[MatchScene] turnResult handler threw:', err);
        }
      });

      const unsubMatchOver = MatchEvents.on('matchOver', ({ winner }) => {
        try {
          // Snap wrestlers back to corners for the end-state presentation
          this._posMgr.resetToCorners();
          const p1Pos = this._posMgr.getPos(p1Data.id);
          const p2Pos = this._posMgr.getPos(p2Data.id);
          this.tweens.killTweensOf(this.p1Sprite);
          this.tweens.killTweensOf(this.p2Sprite);
          this.p1Sprite.x = p1Pos.x;
          this.p2Sprite.x = p2Pos.x;

          const winnerSprite = winner === p1Data.id ? this.p1Sprite : this.p2Sprite;
          const loserSprite  = winner === p1Data.id ? this.p2Sprite : this.p1Sprite;
          if (winnerSprite?.active) winnerSprite.setAnimState('victory');
          if (loserSprite?.active)  loserSprite.setAnimState('down');
        } catch (err) {
          console.error('[MatchScene] matchOver handler threw:', err);
        }
      });

      // Clean up listeners when scene shuts down
      this.events.once('shutdown', () => {
        unsubStamina();
        unsubDamage();
        unsubTurnResult();
        unsubMatchOver();
      });
    }

    // ── Resting state logic ─────────────────────────────────────────────────

    _applyRestingStates(res) {
      const defSprite  = res.defenderId  === p1Data.id ? this.p1Sprite : this.p2Sprite;
      const atkSprite  = res.attackerId  === p1Data.id ? this.p1Sprite : this.p2Sprite;
      const defStamina = this._lastStamina[res.defenderId] ?? Infinity;

      // ── Defender resting state ──────────────────────────────────────────
      if (res.result === 'success') {
        if (defStamina <= 0 || res.damage >= 12) {
          if (defSprite?.active) defSprite.setAnimState('grounded');
        } else if (res.damage > 0) {
          if (defSprite?.active) defSprite.setAnimState('stunned');
        } else {
          if (defSprite?.active) defSprite.setAnimState('idle');
        }
      } else if (res.result === 'reversal') {
        // Original defender reversed successfully — they're fresh
        if (defSprite?.active) defSprite.setAnimState('idle');
      } else {
        // escape or block
        if (defSprite?.active) defSprite.setAnimState('idle');
      }

      // ── Attacker resting state ──────────────────────────────────────────
      if (res.result === 'success') {
        if (atkSprite?.active) {
          atkSprite.setAnimState(res.damage >= 12 ? 'celebrate' : 'idle');
        }
      } else {
        // escape, block, reversal — attacker lost control or took damage
        if (atkSprite?.active) atkSprite.setAnimState('stunned');
      }
    }

  };
}
