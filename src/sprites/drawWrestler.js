// Retired in Session B — replaced by Phaser spritesheet animations.
// Kept as fallback reference.

/**
 * drawWrestler.js
 *
 * Pure drawing functions for 8-bit style wrestler sprites.
 * Works with BOTH Phaser Graphics objects AND HTML5 Canvas 2D contexts
 * via a thin createCtx() adapter.
 *
 * Coordinate system: (0,0) is TOP-LEFT of the bounding box.
 * The caller is responsible for translating if needed.
 *
 * Draw order (painter's algorithm, back to front):
 *   1. Long hair curtains (behind everything above the waist)
 *   2. Legs
 *   3. Footwear
 *   4. Torso
 *   5. Arms
 *   6. Neck
 *   7. Head (outline → face → hair cap)
 *   8. Face details (eyes, nose, mouth)
 *   9. Accessories (mask / headgear / weight belt / wristbands / kneepads)
 */

import { ColorPalette } from './ColorPalette.js';

// ── Size computation ──────────────────────────────────────────────────────────

/**
 * Returns the natural { w, h } pixel dimensions for a wrestler.
 * height_in [67,78] → h [80,110]
 * weight_lb [190,280] → base w [40,65], then build modifier applied.
 */
export function computeSize(wrestler) {
  const { height_in, weight_lb, build } = wrestler.physical;
  const h = Math.round(80 + ((height_in - 67) / (78 - 67)) * 30);
  let w = 40 + ((weight_lb - 190) / (280 - 190)) * 25;
  const b = (build ?? '').toLowerCase();
  if      (b === 'jacked')   w *= 1.10;
  else if (b === 'muscular') w *= 1.05;
  else if (b === 'slim')     w *= 0.90;
  return { w: Math.round(w), h: Math.round(h) };
}

// ── Context adapter ───────────────────────────────────────────────────────────

/**
 * Wraps a Phaser Graphics OR HTML5 Canvas 2D context into a unified
 * drawing interface: fill(hex), rect(x,y,w,h), circle(cx,cy,r).
 */
function createCtx(rawCtx) {
  const isPhaser = typeof rawCtx.fillStyle === 'function';
  return {
    fill(hex) {
      if (isPhaser) rawCtx.fillStyle(parseInt(hex.slice(1), 16), 1);
      else          rawCtx.fillStyle = hex;
    },
    rect(x, y, w, h) {
      if (w <= 0 || h <= 0) return;
      rawCtx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    },
    circle(cx, cy, r) {
      if (r <= 0) return;
      if (isPhaser) {
        rawCtx.fillCircle(Math.round(cx), Math.round(cy), Math.round(r));
      } else {
        rawCtx.beginPath();
        rawCtx.arc(Math.round(cx), Math.round(cy), Math.round(r), 0, Math.PI * 2);
        rawCtx.fill();
      }
    },
    poly(points) {
      if (points.length < 3) return;
      if (isPhaser) {
        rawCtx.fillPoints(points, true);
      } else {
        rawCtx.beginPath();
        rawCtx.moveTo(Math.round(points[0].x), Math.round(points[0].y));
        for (let i = 1; i < points.length; i++) {
          rawCtx.lineTo(Math.round(points[i].x), Math.round(points[i].y));
        }
        rawCtx.closePath();
        rawCtx.fill();
      }
    },
  };
}

// ── Palette helper ────────────────────────────────────────────────────────────

function pal(colorName) {
  return ColorPalette[colorName?.toLowerCase()] ?? null;
}

// ── Main drawing function ─────────────────────────────────────────────────────

/**
 * drawWrestler(rawCtx, wrestler, options)
 *
 * Draws the wrestler starting at (0,0) in rawCtx.
 *
 * @param {object} options
 *   width   — override draw width  (default: computeSize().w)
 *   height  — override draw height (default: computeSize().h)
 *   victory — boolean, draw both-arms-raised pose
 *   smile   — boolean, draw upward mouth curve (victory / celebrate)
 */
export function drawWrestler(rawCtx, wrestler, options = {}) {
  const { appearance, physical } = wrestler;
  const id = wrestler.id ?? '';

  // ── Wrestler archetype flags ──────────────────────────────────────────────
  const isBogan   = id === 'bulk_bogan';
  const isAguilia = id === 'el_aguilia_blanca';
  const isTank    = id === 'tank_thompson';
  const isMilkman = id === 'mike_milkman';

  const natural = computeSize(wrestler);
  const W       = options.width   ?? natural.w;
  const H       = options.height  ?? natural.h;
  const victory = options.victory ?? false;
  const smile   = options.smile   ?? false;

  const ctx = createCtx(rawCtx);

  // ── Proportional zones (top=0, bottom=H) ─────────────────────────────────
  const headH  = Math.round(H * 0.20);
  const neckH  = Math.max(4, Math.round(H * 0.06));
  const torsoH = Math.round(H * 0.32);
  const legsH  = Math.round(H * 0.35);
  const feetH  = Math.max(4, H - headH - neckH - torsoH - legsH);

  const torsoTop = headH + neckH;
  const legsTop  = torsoTop + torsoH;
  const feetTop  = legsTop + legsH;

  // ── Color palettes ────────────────────────────────────────────────────────
  const skinPal     = pal(physical.skin_color);
  const costumePal  = pal(appearance.costume_color);
  const footwearPal = pal(appearance.footwear_color);
  const hairPal     = pal(appearance.hair_color);
  const accessPal   = pal(appearance.accessory_color);

  const isSinglet = (appearance.costume_type ?? '').toLowerCase() === 'singlet';
  const accessory = (appearance.accessory   ?? '').toLowerCase();
  const hairstyle = (appearance.hairstyle   ?? '').toLowerCase();

  // ── Derived measurements ──────────────────────────────────────────────────
  const cx = Math.round(W / 2);

  // Torso width — Milkman is slightly narrower
  const torsoXPct = isMilkman ? 0.08 : 0.05;
  const torsoX    = Math.round(W * torsoXPct);
  const torsoW    = W - torsoX * 2;

  // Trapezoid waist: bottom of torso is 75% of shoulder width, centered
  const inset  = Math.round(torsoW * 0.125);
  const waistX = torsoX + inset;
  const waistW = torsoW - 2 * inset;

  // Neck width — Bogan has a thick neck (50% torso width)
  const neckWPct = isBogan ? 0.50 : 0.28;
  const neckW    = Math.max(4, Math.round(torsoW * neckWPct));
  const neckX    = cx - Math.round(neckW / 2);

  // Legs — Tank has wider stance
  const legGapBase = Math.max(1, Math.round(W * 0.06));
  const legGap     = isTank ? Math.round(legGapBase * 1.5) : legGapBase;
  const legW       = Math.max(3, Math.round(W * 0.38));
  const leftLegX   = cx - legW - Math.round(legGap / 2);
  const rightLegX  = cx + Math.round(legGap / 2);

  // Arms — Bogan wider, Milkman thinner
  const armWBase = Math.max(2, Math.round(W * 0.13));
  const armW     = isBogan  ? Math.round(armWBase * 1.25)
                 : isMilkman ? Math.round(armWBase * 0.75)
                 : armWBase;
  const armH = Math.round(torsoH * 0.82);
  const armTop = torsoTop + Math.round(torsoH * 0.06);

  // Head
  const headR  = Math.round(headH / 2);
  const headCX = cx;
  const headCY = headR; // circle center at top of bounding box + radius

  // ── 1. Long hair curtains (draw first — behind everything above waist) ────
  if (hairPal && hairstyle === 'long') {
    const curtainW = Math.max(3, Math.round(headR * 0.55));
    const curtainH = Math.round((neckH + torsoH) * 0.72);
    const curtainY = headCY + Math.round(headR * 0.35);
    ctx.fill(hairPal.base);
    ctx.rect(headCX - headR - curtainW + 4, curtainY, curtainW, curtainH);
    ctx.rect(headCX + headR - 4,           curtainY, curtainW, curtainH);
    ctx.fill(hairPal.highlight);
    ctx.rect(headCX - headR - curtainW + 4, curtainY, 2, curtainH);
  }

  // ── 2. Legs ───────────────────────────────────────────────────────────────
  const legColor = isSinglet ? costumePal : skinPal;
  if (legColor) {
    ctx.fill(legColor.base);
    ctx.rect(leftLegX,  legsTop, legW, legsH);
    ctx.rect(rightLegX, legsTop, legW, legsH);
    // Highlight outer edge, shadow inner edge
    ctx.fill(legColor.highlight);
    ctx.rect(leftLegX,              legsTop, 2, legsH);
    ctx.rect(rightLegX + legW - 2,  legsTop, 2, legsH);
    ctx.fill(legColor.shadow);
    ctx.rect(leftLegX  + legW - 2,  legsTop, 2, legsH);
    ctx.rect(rightLegX,             legsTop, 2, legsH);
    // Knee line at 60% of leg height
    const kneeY = legsTop + Math.round(legsH * 0.60);
    ctx.fill(legColor.shadow);
    ctx.rect(leftLegX,  kneeY, legW, 1);
    ctx.rect(rightLegX, kneeY, legW, 1);
  }

  // ── 3. Footwear ───────────────────────────────────────────────────────────
  if (footwearPal && feetH > 0) {
    const isBoots   = (appearance.footwear_type ?? '').toLowerCase() === 'boots';
    const bootExtra = isBoots ? Math.round(legsH * 0.18) : 0;
    const shoeH     = feetH + bootExtra;
    const shoeTop   = feetTop - bootExtra;
    // Milkman: use darker brown for boots so they contrast against mid-brown trunks
    const bootColor = isMilkman ? footwearPal.shadow : footwearPal.base;
    ctx.fill(bootColor);
    ctx.rect(leftLegX,  shoeTop, legW, shoeH);
    ctx.rect(rightLegX, shoeTop, legW, shoeH);
    // Boot-top highlight line
    ctx.fill(footwearPal.highlight);
    ctx.rect(leftLegX,  shoeTop, legW, 2);
    ctx.rect(rightLegX, shoeTop, legW, 2);
  }

  // ── 4. Torso (trapezoid: full shoulder width at top, 75% waist width at bottom) ──────
  const hlW = Math.max(2, Math.round(waistW * 0.10)); // highlight/shadow strip width

  if (isSinglet) {
    // Full singlet: costume color, tapered trapezoid
    if (costumePal) {
      ctx.fill(costumePal.base);
      ctx.poly([
        { x: torsoX,               y: torsoTop },
        { x: torsoX + torsoW,      y: torsoTop },
        { x: waistX + waistW,      y: torsoTop + torsoH },
        { x: waistX,               y: torsoTop + torsoH },
      ]);
      // Subtle top-edge highlight at shoulders
      ctx.fill(costumePal.highlight);
      ctx.rect(torsoX, torsoTop, torsoW, 2);
    }

    // V-neck cutout: skin-colour stepped triangle at top centre of torso
    if (skinPal && costumePal) {
      const vRows  = Math.min(9, Math.round(torsoH * 0.28));
      const maxVW  = Math.round(torsoW * 0.42);
      for (let i = 0; i < vRows; i++) {
        const rowW = Math.max(2, Math.round(2 + i * (maxVW / vRows)));
        ctx.fill(skinPal.base);
        ctx.rect(cx - Math.round(rowW / 2), torsoTop + i, rowW, 1);
      }
    }

    // El Aguilia — green shoulder trim lines along strap edges
    if (isAguilia && footwearPal) {
      ctx.fill(footwearPal.base);
      const trimH = Math.round(torsoH * 0.38);
      ctx.rect(torsoX + 2,           torsoTop, 2, trimH);
      ctx.rect(torsoX + torsoW - 4,  torsoTop, 2, trimH);
    }

  } else {
    // Trunks: skin tapered trapezoid on top, costume rectangle at waist on bottom
    const trunksH   = Math.round(torsoH * 0.52);
    const trunksTop = torsoTop + torsoH - trunksH;
    const skinAreaH = torsoH - trunksH;

    // Skin upper torso — tapered trapezoid from shoulders to waist
    if (skinPal) {
      ctx.fill(skinPal.base);
      ctx.poly([
        { x: torsoX,               y: torsoTop },
        { x: torsoX + torsoW,      y: torsoTop },
        { x: waistX + waistW,      y: trunksTop },
        { x: waistX,               y: trunksTop },
      ]);
      // Top highlight at shoulder edge
      ctx.fill(skinPal.highlight);
      ctx.rect(torsoX, torsoTop, torsoW, 2);
    }

    // Bogan — pectoral definition: two subtle shadow lines in upper chest
    if (isBogan && skinPal && skinAreaH > 6) {
      const pecW = Math.round((torsoW - 8) / 2);
      const pecY = torsoTop + Math.round(skinAreaH * 0.35);
      ctx.fill(skinPal.shadow);
      ctx.rect(torsoX + 4,             pecY, pecW, 1);
      ctx.rect(torsoX + 4 + pecW + 2, pecY, pecW, 1);
    }

    // Trunks lower torso — rectangle at waist width
    if (costumePal) {
      ctx.fill(costumePal.base);
      ctx.rect(waistX, trunksTop, waistW, trunksH);
      ctx.fill(costumePal.highlight);
      ctx.rect(waistX, trunksTop, hlW, trunksH);
      ctx.fill(costumePal.shadow);
      ctx.rect(waistX + waistW - hlW, trunksTop, hlW, trunksH);
    }
  }

  // ── 5. Arms ───────────────────────────────────────────────────────────────
  if (skinPal) {
    if (victory) {
      // Arms raised above head
      const raisedH   = Math.round(torsoH * 0.95);
      const raisedTop = torsoTop - raisedH + Math.round(raisedH * 0.30);
      ctx.fill(skinPal.base);
      ctx.rect(torsoX - armW - 1, raisedTop, armW, raisedH);
      ctx.rect(torsoX + torsoW + 1, raisedTop, armW, raisedH);
      ctx.fill(skinPal.highlight);
      ctx.rect(torsoX - armW - 1, raisedTop, 2, raisedH);
      ctx.rect(torsoX + torsoW + 1, raisedTop, 2, raisedH);
    } else {
      // Arms hang at sides
      ctx.fill(skinPal.base);
      ctx.rect(torsoX - armW - 1, armTop, armW, armH);
      ctx.rect(torsoX + torsoW + 1, armTop, armW, armH);
      ctx.fill(skinPal.highlight);
      ctx.rect(torsoX - armW - 1, armTop, 2, armH);
      ctx.rect(torsoX + torsoW + 1, armTop, 2, armH);
    }
  }

  // ── 6. Neck ───────────────────────────────────────────────────────────────
  if (skinPal) {
    ctx.fill(skinPal.base);
    ctx.rect(neckX, headH, neckW, neckH);
    // Subtle shadow on right side of neck
    ctx.fill(skinPal.shadow);
    ctx.rect(neckX + neckW - 2, headH, 2, neckH);
  }

  // ── 7. Head ───────────────────────────────────────────────────────────────
  if (skinPal) {
    // Outline (1px larger in shadow colour)
    ctx.fill(skinPal.shadow);
    ctx.circle(headCX, headCY, headR + 1);
    // Main face
    ctx.fill(skinPal.base);
    ctx.circle(headCX, headCY, headR);
    // Highlight — upper-left quarter
    ctx.fill(skinPal.highlight);
    ctx.circle(
      headCX - Math.round(headR * 0.22),
      headCY - Math.round(headR * 0.22),
      Math.round(headR * 0.32),
    );
  }

  // Hair cap — drawn over the head circle
  if (hairPal && hairstyle !== 'none') {
    ctx.fill(hairPal.base);
    if (hairstyle === 'long') {
      ctx.circle(headCX, headCY - Math.round(headR * 0.12), Math.round(headR * 0.84));
    } else if (hairstyle === 'medium') {
      ctx.circle(headCX, headCY - Math.round(headR * 0.10), Math.round(headR * 0.80));
      const sideW = Math.max(2, Math.round(headR * 0.30));
      const sideH = Math.round(headH * 0.30);
      ctx.rect(headCX - headR - sideW + 4, headCY - Math.round(headR * 0.18), sideW, sideH);
      ctx.rect(headCX + headR - 4,         headCY - Math.round(headR * 0.18), sideW, sideH);
    } else if (hairstyle === 'short') {
      // Dark cap rectangle sitting on top of the head
      const capW = Math.round(headR * 1.40);   // 70% of head diameter
      const capH = Math.round(headR * 0.50);   // 25% of head diameter
      ctx.rect(headCX - Math.round(capW / 2), headCY - headR, capW, capH);
    }
    // Hair highlight
    ctx.fill(hairPal.highlight);
    ctx.circle(
      headCX - Math.round(headR * 0.22),
      headCY - Math.round(headR * 0.42),
      Math.round(headR * 0.20),
    );
  }

  // ── 8. Face details (skipped if mask covers the face) ─────────────────────
  if (accessory !== 'mask') {
    // Eyes: two 2×2 filled rectangles at 35%/65% horizontal, 38% vertical of head circle
    // (all percentages measured within the head circle bounding box)
    const eyeY   = Math.round(headCY - headR + 0.38 * (2 * headR));  // headCY - 0.24*headR
    const eyeOff = Math.round(headR * 0.30);                          // 35%/65% → ±30% of radius
    ctx.fill('#2a1a0a');
    ctx.rect(headCX - eyeOff - 1, eyeY, 2, 2);
    ctx.rect(headCX + eyeOff - 1, eyeY, 2, 2);

    // Nose — right-side bump (direction indicator; mirrored by scaleX=-1 for left-facing)
    if (skinPal) {
      const noseW = Math.max(2, Math.round(headR * 0.30));
      const noseH = Math.max(2, Math.round(headR * 0.22));
      ctx.fill(skinPal.shadow);
      ctx.rect(
        headCX + Math.round(headR * 0.20),
        headCY + Math.round(headR * 0.08),
        noseW, noseH,
      );
    }

    // Mouth: 50% horizontal, 65% vertical of head circle
    const mouthX = headCX;
    const mouthY = Math.round(headCY - headR + 0.65 * (2 * headR));  // headCY + 0.30*headR
    ctx.fill('#2a1a0a');
    if (smile) {
      // Shallow arc: left and right corners up, centre down
      ctx.rect(mouthX - 4, mouthY,     2, 1); // left corner
      ctx.rect(mouthX - 1, mouthY + 1, 2, 1); // centre (lower)
      ctx.rect(mouthX + 3, mouthY,     2, 1); // right corner
    } else {
      // Flat neutral line
      ctx.rect(mouthX - 2, mouthY, 4, 1);
    }
  }

  // ── 9. Accessories ─────────────────────────────────────────────────────────
  if (!accessPal || accessory === 'none') return;

  // ── Wristbands ──────────────────────────────────────────────────────────
  if (accessory === 'wristbands') {
    ctx.fill(accessPal.base);
    if (victory) {
      // Arms are raised — bands appear at the top (wrist) end of raised arms
      const raisedH   = Math.round(torsoH * 0.95);
      const raisedTop = torsoTop - raisedH + Math.round(raisedH * 0.30);
      const bandH     = Math.max(3, Math.round(armH * 0.16));
      ctx.rect(torsoX - armW - 1,   raisedTop, armW, bandH);
      ctx.rect(torsoX + torsoW + 1, raisedTop, armW, bandH);
    } else {
      const bandH   = Math.max(3, Math.round(armH * 0.16));
      const bandTop = armTop + armH - bandH;
      ctx.rect(torsoX - armW - 1,   bandTop, armW, bandH);
      ctx.rect(torsoX + torsoW + 1, bandTop, armW, bandH);
      ctx.fill(accessPal.highlight);
      ctx.rect(torsoX - armW - 1,   bandTop, armW, 2);
      ctx.rect(torsoX + torsoW + 1, bandTop, armW, 2);
    }
  }

  // ── Mask ─────────────────────────────────────────────────────────────────
  else if (accessory === 'mask') {
    // Mask base — full face circle
    ctx.fill(accessPal.base);
    ctx.circle(headCX, headCY, headR);

    if (isAguilia && footwearPal) {
      // El Aguilia Blanca: white base + distinctive green accents
      const green = footwearPal; // green boots palette reused for mask detail

      // Horizontal eye band
      const eyeBandH = Math.max(4, Math.round(headR * 0.30));
      const eyeBandY = headCY - Math.round(headR * 0.20);
      ctx.fill(green.base);
      ctx.rect(headCX - Math.round(headR * 0.85), eyeBandY,
               Math.round(headR * 1.70), eyeBandH);

      // Eye holes (white circles within the green band)
      const holeR  = Math.max(2, Math.round(headR * 0.15));
      const holeSep = Math.round(headR * 0.36);
      ctx.fill(accessPal.base);
      ctx.circle(headCX - holeSep, eyeBandY + Math.round(eyeBandH / 2), holeR);
      ctx.circle(headCX + holeSep, eyeBandY + Math.round(eyeBandH / 2), holeR);

      // Vertical cheek stripes below the eye band
      const stripeW = Math.max(2, Math.round(headR * 0.18));
      const stripeH = Math.round(headR * 0.45);
      ctx.fill(green.base);
      ctx.rect(headCX - Math.round(headR * 0.72),              eyeBandY + eyeBandH, stripeW, stripeH);
      ctx.rect(headCX + Math.round(headR * 0.72) - stripeW, eyeBandY + eyeBandH, stripeW, stripeH);

      // Thin forehead band
      const fhY = headCY - Math.round(headR * 0.66);
      ctx.rect(headCX - Math.round(headR * 0.52), fhY,
               Math.round(headR * 1.04), 3);

      // Diamond motif above forehead band (three stacked rects: 2-4-2 wide)
      const dimY = fhY - 5;
      ctx.rect(headCX - 1, dimY,     2, 1);
      ctx.rect(headCX - 2, dimY + 1, 4, 1);
      ctx.rect(headCX - 1, dimY + 2, 2, 1);

      // Mask sheen highlight
      ctx.fill(accessPal.highlight);
      ctx.circle(
        headCX - Math.round(headR * 0.25),
        headCY - Math.round(headR * 0.32),
        Math.round(headR * 0.20),
      );

    } else {
      // Generic mask: shadow eye strip + highlight
      ctx.fill(accessPal.shadow);
      const eyeH = Math.max(3, Math.round(headR * 0.28));
      ctx.rect(headCX - Math.round(headR * 0.70), headCY - Math.round(headR * 0.15),
               Math.round(headR * 1.40), eyeH);
      ctx.fill(accessPal.highlight);
      ctx.circle(headCX - Math.round(headR * 0.20), headCY - Math.round(headR * 0.25),
                 Math.round(headR * 0.28));
    }
  }

  // ── Weight belt ───────────────────────────────────────────────────────────
  else if (accessory === 'weight belt' && !isTank) {
    // Positioned at the skin/trunks boundary
    const trunksH  = Math.round(torsoH * 0.52);
    const skinAreaH = torsoH - trunksH;
    const beltH    = Math.max(5, Math.round(torsoH * 0.15));
    const beltTop  = torsoTop + skinAreaH - Math.round(beltH * 0.5);
    ctx.fill(accessPal.base);
    ctx.rect(torsoX, beltTop, torsoW, beltH);
    // Top highlight
    ctx.fill(accessPal.highlight);
    ctx.rect(torsoX, beltTop, torsoW, 2);
    // Gold buckle centre
    const buckleW = Math.max(4, Math.round(torsoW * 0.22));
    ctx.fill('#d4aa30');
    ctx.rect(cx - Math.round(buckleW / 2), beltTop + 1, buckleW, beltH - 2);
  }

  // ── Headgear ─────────────────────────────────────────────────────────────
  else if (accessory === 'headgear') {
    const gearH = Math.max(4, Math.round(headR * 0.55));
    ctx.fill(accessPal.base);
    // Main band across top of head
    ctx.rect(headCX - headR + 2, headCY - headR, (headR - 2) * 2, gearH);
    // Side straps (ear cups)
    const strapW = Math.max(2, Math.round(headR * 0.22));
    const strapH = Math.round(headR * 0.68);
    ctx.rect(headCX - headR,          headCY - Math.round(headR * 0.08), strapW, strapH);
    ctx.rect(headCX + headR - strapW, headCY - Math.round(headR * 0.08), strapW, strapH);
    // Top highlight
    ctx.fill(accessPal.highlight);
    ctx.rect(headCX - headR + 2, headCY - headR, (headR - 2) * 2, 2);
  }

  // ── Kneepads ─────────────────────────────────────────────────────────────
  else if (accessory === 'kneepads') {
    // Centre pads on the knee line (60% of leg height)
    const padH   = Math.max(4, Math.round(legsH * 0.22));
    const kneeY  = legsTop + Math.round(legsH * 0.60);
    const padTop = kneeY - Math.round(padH / 2);
    // Milkman: use lighter brown highlight so pads contrast above dark boots and mid trunks
    const padBase = isMilkman ? accessPal.highlight : accessPal.base;
    ctx.fill(padBase);
    ctx.rect(leftLegX,  padTop, legW, padH);
    ctx.rect(rightLegX, padTop, legW, padH);
    ctx.fill(accessPal.highlight);
    ctx.rect(leftLegX,  padTop, legW, 2);
    ctx.rect(rightLegX, padTop, legW, 2);
  }
}
