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
  { tag: 'Idle',         start: 0,  end: 2,  frameRate: 6,  repeat: -1 },
  { tag: 'Strike',       start: 3,  end: 5,  frameRate: 12, repeat: 0  },
  { tag: 'Hit Reaction', start: 6,  end: 8,  frameRate: 10, repeat: 0  },
  { tag: 'Down',         start: 9,  end: 11, frameRate: 6,  repeat: 0  },
  { tag: 'Victory',      start: 12, end: 14, frameRate: 6,  repeat: -1 },
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
      WRESTLERS.forEach(id => {
        this.load.spritesheet(id,
          `src/assets/sprites/${id}.png`,
          { frameWidth: 32, frameHeight: 32 }
        );
        this.load.json(`${id}_data`, `src/assets/sprites/${id}.json`);
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
      this.add.rectangle(400, 300, 800, 600, 0x0d0d1a);
      this.add.rectangle(400, 322, 660, 390, 0x4a2e10); // apron
      this.add.rectangle(400, 312, 596, 280, 0xc8b896); // mat

      // ── Ropes and posts ─────────────────────────────────────────────────
      const g = this.add.graphics();
      const RL = 102, RR = 698;

      g.lineStyle(3, 0xf0d070, 1);
      [145, 158, 172].forEach(y => g.lineBetween(RL, y, RR, y)); // top ropes
      [452, 465, 478].forEach(y => g.lineBetween(RL, y, RR, y)); // bottom ropes

      g.lineStyle(3, 0xf0d070, 0.5);
      g.lineBetween(RL, 145, RL, 478); // left side
      g.lineBetween(RR, 145, RR, 478); // right side

      g.fillStyle(0x8b6914, 1);
      [[RL, 145], [RR, 145], [RL, 478], [RR, 478]].forEach(([x, y]) => {
        g.fillRect(x - 7, y - 7, 14, 14);
      });

      // ── Wrestler sprites ─────────────────────────────────────────────────
      const MAT_BOTTOM = 452;
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

      // ── Name labels ──────────────────────────────────────────────────────
      const txtStyle = { fontFamily: 'monospace', fontSize: '10px' };
      const labelY   = MAT_BOTTOM - this.p1Sprite._spriteH - 8;
      this.add.text(P1_X, labelY, p1Data.name,
        { ...txtStyle, color: '#44ccff' }).setOrigin(0.5, 1);
      this.add.text(P2_X, labelY, p2Data.name,
        { ...txtStyle, color: '#ff7777' }).setOrigin(0.5, 1);

      // ── Stamina cache (updated by 'stamina' event) ───────────────────────
      this._lastStamina = { [p1Data.id]: Infinity, [p2Data.id]: Infinity };

      // ── MatchEvents listeners ─────────────────────────────────────────────
      // All callbacks are wrapped in try/catch so any Phaser error is logged
      // here and does NOT propagate up into React's event loop (which would
      // unmount the entire app and produce a white screen).

      // eslint-disable-next-line no-console
      console.log('[MatchScene] create() done — MatchEvents listeners registering');

      const unsubStamina = MatchEvents.on('stamina', (vals) => {
        // eslint-disable-next-line no-console
        console.log('[MatchScene] stamina event received', vals);
        try {
          this._lastStamina = vals;
          // Safety net: if a wrestler's stamina drops into pin range while
          // they're still in idle, force them visually grounded.
          [
            { id: p1Data.id, sprite: this.p1Sprite },
            { id: p2Data.id, sprite: this.p2Sprite },
          ].forEach(({ id, sprite }) => {
            if ((vals[id] ?? Infinity) < 20 && sprite?.active && sprite._state === 'idle') {
              sprite.setState('grounded');
            }
          });
        } catch (err) {
          console.error('[MatchScene] stamina handler threw:', err);
        }
      });

      const unsubDamage = MatchEvents.on('damage', ({ wrestlerId }) => {
        // eslint-disable-next-line no-console
        console.log('[MatchScene] damage event received — wrestlerId:', wrestlerId, 'p1Active:', this.p1Sprite?.active, 'p2Active:', this.p2Sprite?.active);
        try {
          const sprite = wrestlerId === p1Data.id ? this.p1Sprite : this.p2Sprite;
          if (sprite?.active) sprite.setState('hit');
        } catch (err) {
          console.error('[MatchScene] damage handler threw:', err);
        }
      });

      const unsubTurnResult = MatchEvents.on('turnResult', (res) => {
        // eslint-disable-next-line no-console
        console.log('[MatchScene] turnResult received — result:', res.result, 'attacker:', res.attackerId);
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
          if (winnerSprite?.active) winnerSprite.setState('victory');
          if (loserSprite?.active)  loserSprite.setState('down');
          const winnerName = winner === p1Data.id ? p1Data.name : p2Data.name;
          this._showWinnerBanner(winnerName);
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
          if (defSprite?.active) defSprite.setState('grounded');
        } else if (res.damage > 0) {
          if (defSprite?.active) defSprite.setState('stunned');
        } else {
          if (defSprite?.active) defSprite.setState('idle');
        }
      } else if (res.result === 'reversal') {
        // Original defender reversed successfully — they're fresh
        if (defSprite?.active) defSprite.setState('idle');
      } else {
        // escape or block
        if (defSprite?.active) defSprite.setState('idle');
      }

      // ── Attacker resting state ──────────────────────────────────────────
      if (res.result === 'success') {
        if (atkSprite?.active) {
          atkSprite.setState(res.damage >= 12 ? 'celebrate' : 'idle');
        }
      } else {
        // escape, block, reversal — attacker lost control or took damage
        if (atkSprite?.active) atkSprite.setState('stunned');
      }
    }

    // ── Visual helpers ──────────────────────────────────────────────────────

    _showWinnerBanner(name) {
      const W = 800, H = 600;
      this.add.rectangle(W / 2, H / 2, 480, 80, 0x000000, 0.85);
      this.add.text(W / 2, H / 2, `${name} WINS!`, {
        fontSize: '28px',
        color: '#ffd700',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }
  };
}
