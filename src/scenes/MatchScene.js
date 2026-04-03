import Phaser from 'phaser';

/**
 * Map a wrestler's physical stats to placeholder sprite dimensions.
 *
 * Height range 67-78 in → 70-120 px tall
 * Weight range 190-280 lb → 22-46 px wide
 */
function spriteSize(wrestler) {
  const { height_in, weight_lb } = wrestler.physical;
  const h = Math.round(70 + ((height_in - 67) / (78 - 67)) * 50);
  const w = Math.round(22 + ((weight_lb - 190) / (280 - 190)) * 24);
  return { w, h };
}

/**
 * Factory that closes over wrestler data so the scene can access it
 * without relying on Phaser's scene data object.
 *
 * @param {object} p1Data - full wrestler object from wrestlers.json
 * @param {object} p2Data
 * @returns {typeof Phaser.Scene}
 */
export function createMatchScene(p1Data, p2Data) {
  return class MatchScene extends Phaser.Scene {
    constructor() {
      super({ key: 'MatchScene' });
    }

    create() {
      const W = 800;
      const H = 600;

      // ── Background (arena darkness) ───────────────────────────────────────
      this.add.rectangle(W / 2, H / 2, W, H, 0x0d0d1a);

      // ── Ring apron (outer platform — dark wood) ───────────────────────────
      // Centered at (400, 322), 660 × 390
      this.add.rectangle(400, 322, 660, 390, 0x4a2e10);

      // ── Ring mat (canvas surface) ──────────────────────────────────────────
      // Inner mat: x: 102–698, y: 172–452  (center: 400, 312; 596 × 280)
      this.add.rectangle(400, 312, 596, 280, 0xc8b896);

      // ── Graphics layer for ropes and posts ───────────────────────────────
      const g = this.add.graphics();

      const ROPE_L = 102;  // left post x
      const ROPE_R = 698;  // right post x
      const ROPE_COLOR = 0xf0d070;

      // Top ropes (three lines above the mat)
      g.lineStyle(3, ROPE_COLOR, 1);
      [145, 158, 172].forEach(y => g.lineBetween(ROPE_L, y, ROPE_R, y));

      // Bottom ropes (three lines below the mat)
      [452, 465, 478].forEach(y => g.lineBetween(ROPE_L, y, ROPE_R, y));

      // Vertical rope segments on each side connecting the three ropes
      // (just the short post-to-first-rope section at corners)
      g.lineStyle(3, ROPE_COLOR, 0.5);
      // Left side vertical
      g.lineBetween(ROPE_L, 145, ROPE_L, 478);
      // Right side vertical
      g.lineBetween(ROPE_R, 145, ROPE_R, 478);

      // Ring posts — four corner pillars
      const POST_COLOR = 0x8b6914;
      g.lineStyle(1, 0x000000, 0);
      g.fillStyle(POST_COLOR, 1);
      [
        [ROPE_L, 145],
        [ROPE_R, 145],
        [ROPE_L, 478],
        [ROPE_R, 478],
      ].forEach(([x, y]) => {
        g.fillRect(x - 7, y - 7, 14, 14);
      });

      // ── Wrestler placeholder sprites ───────────────────────────────────────
      const MAT_BOTTOM = 452; // y-coordinate of the mat surface (feet level)

      const p1Size = spriteSize(p1Data);
      const p2Size = spriteSize(p2Data);

      const P1_X = 230;
      const P2_X = 570;

      // P1 — blue rect, left side of ring
      this.add.rectangle(
        P1_X,
        MAT_BOTTOM - p1Size.h / 2,
        p1Size.w,
        p1Size.h,
        0x0088dd,
      );

      // P2 — red rect, right side of ring
      this.add.rectangle(
        P2_X,
        MAT_BOTTOM - p2Size.h / 2,
        p2Size.w,
        p2Size.h,
        0xcc2222,
      );

      // ── Name labels ─────────────────────────────────────────────────────────
      const textStyle = { fontFamily: 'monospace', fontSize: '10px' };

      this.add.text(
        P1_X,
        MAT_BOTTOM - p1Size.h - 8,
        p1Data.name,
        { ...textStyle, color: '#44ccff' },
      ).setOrigin(0.5, 1);

      this.add.text(
        P2_X,
        MAT_BOTTOM - p2Size.h - 8,
        p2Data.name,
        { ...textStyle, color: '#ff7777' },
      ).setOrigin(0.5, 1);
    }
  };
}
