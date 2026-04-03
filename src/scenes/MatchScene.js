import Phaser from 'phaser';
import { MatchEvents }   from '../engine/MatchEvents.js';
import { WrestlerSprite } from '../sprites/WrestlerSprite.js';

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

      // ── Wrestler sprites ─────────────────────────────────────────────────
      const MAT_BOTTOM = 452;
      const P1_X = 230, P2_X = 570;

      this.p1Sprite = new WrestlerSprite(this, P1_X, MAT_BOTTOM, p1Data, 'right');
      this.p2Sprite = new WrestlerSprite(this, P2_X, MAT_BOTTOM, p2Data, 'left');
      this.add.existing(this.p1Sprite);
      this.add.existing(this.p2Sprite);

      // ── Name labels ──────────────────────────────────────────────────────
      const txtStyle = { fontFamily: 'monospace', fontSize: '10px' };
      this.add.text(P1_X, MAT_BOTTOM - this.p1Sprite._spriteH - 8, p1Data.name,
        { ...txtStyle, color: '#44ccff' }).setOrigin(0.5, 1);
      this.add.text(P2_X, MAT_BOTTOM - this.p2Sprite._spriteH - 8, p2Data.name,
        { ...txtStyle, color: '#ff7777' }).setOrigin(0.5, 1);

      // ── MatchEvents listeners ─────────────────────────────────────────────
      const unsubDamage = MatchEvents.on('damage', ({ wrestlerId }) => {
        const sprite = wrestlerId === p1Data.id ? this.p1Sprite : this.p2Sprite;
        sprite.setState('hit');
      });

      const unsubTurnResult = MatchEvents.on('turnResult', (res) => {
        if (res.result !== 'success') return;
        // Attacker lunges 15 px toward opponent then springs back
        const atkSprite = res.attackerId === p1Data.id ? this.p1Sprite : this.p2Sprite;
        const dir = res.attackerId === p1Data.id ? 1 : -1;
        const startX = atkSprite.x;
        this.tweens.add({
          targets:  atkSprite,
          x:        startX + dir * 15,
          duration: 120,
          ease:     'Quad.easeOut',
          yoyo:     true,
        });
      });

      const unsubMatchOver = MatchEvents.on('matchOver', ({ winner }) => {
        const winnerSprite = winner === p1Data.id ? this.p1Sprite : this.p2Sprite;
        const loserSprite  = winner === p1Data.id ? this.p2Sprite : this.p1Sprite;
        winnerSprite.setState('victory');
        loserSprite.setState('down');

        const winnerName = winner === p1Data.id ? p1Data.name : p2Data.name;
        this._showWinnerBanner(winnerName);
      });

      // Clean up listeners when scene shuts down
      this.events.once('shutdown', () => {
        unsubDamage();
        unsubTurnResult();
        unsubMatchOver();
      });
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
