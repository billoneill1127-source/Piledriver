import Phaser from 'phaser';
import { MatchEvents } from '../engine/MatchEvents.js';

/**
 * Map physical stats to placeholder sprite dimensions.
 * Height 67-78 in → 70-120 px   |   Weight 190-280 lb → 22-46 px
 */
function spriteSize(wrestler) {
  const { height_in, weight_lb } = wrestler.physical;
  const h = Math.round(70 + ((height_in - 67) / (78 - 67)) * 50);
  const w = Math.round(22 + ((weight_lb - 190) / (280 - 190)) * 24);
  return { w, h };
}

/**
 * Factory that closes over wrestler data so the scene doesn't rely on
 * Phaser's scene-data mechanism.
 */
export function createMatchScene(p1Data, p2Data) {
  return class MatchScene extends Phaser.Scene {
    constructor() {
      super({ key: 'MatchScene' });
    }

    create() {
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

      // ── Wrestler placeholder sprites ─────────────────────────────────────
      const MAT_BOTTOM = 452;
      const P1_X = 230, P2_X = 570;
      const p1Size = spriteSize(p1Data);
      const p2Size = spriteSize(p2Data);

      this.p1Rect = this.add.rectangle(
        P1_X, MAT_BOTTOM - p1Size.h / 2, p1Size.w, p1Size.h, 0x0088dd,
      );
      this.p2Rect = this.add.rectangle(
        P2_X, MAT_BOTTOM - p2Size.h / 2, p2Size.w, p2Size.h, 0xcc2222,
      );
      this.p1BaseColor = 0x0088dd;
      this.p2BaseColor = 0xcc2222;

      // ── Name labels ──────────────────────────────────────────────────────
      const txtStyle = { fontFamily: 'monospace', fontSize: '10px' };
      this.add.text(P1_X, MAT_BOTTOM - p1Size.h - 8, p1Data.name, { ...txtStyle, color: '#44ccff' }).setOrigin(0.5, 1);
      this.add.text(P2_X, MAT_BOTTOM - p2Size.h - 8, p2Data.name, { ...txtStyle, color: '#ff7777' }).setOrigin(0.5, 1);

      // ── MatchEvents listeners ─────────────────────────────────────────────
      const unsubDamage = MatchEvents.on('damage', ({ wrestlerId }) => {
        const rect      = wrestlerId === p1Data.id ? this.p1Rect : this.p2Rect;
        const baseColor = wrestlerId === p1Data.id ? this.p1BaseColor : this.p2BaseColor;
        this._flashRect(rect, baseColor);
      });

      const unsubMatchOver = MatchEvents.on('matchOver', ({ winnerName }) => {
        this._showWinnerBanner(winnerName);
      });

      // Clean up listeners when scene shuts down
      this.events.once('shutdown', () => {
        unsubDamage();
        unsubMatchOver();
      });
    }

    // ── Visual helpers ──────────────────────────────────────────────────────

    _flashRect(rect, baseColor) {
      if (!rect?.active) return;
      rect.setFillStyle(0xffffff);
      this.time.delayedCall(160, () => {
        if (rect?.active) rect.setFillStyle(baseColor);
      });
    }

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
