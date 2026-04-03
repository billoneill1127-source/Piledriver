/**
 * drawWrestler.js
 *
 * Pure drawing functions for 16-bit style wrestler sprites.
 * Works with BOTH Phaser Graphics objects AND HTML5 Canvas 2D contexts
 * via a thin createCtx() adapter.
 *
 * Coordinate system: (0,0) is TOP-LEFT of the bounding box.
 * The caller is responsible for translating if needed.
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
  if (b === 'jacked')    w *= 1.10;
  else if (b === 'muscular') w *= 1.05;
  else if (b === 'slim')     w *= 0.90;
  return { w: Math.round(w), h: Math.round(h) };
}

// ── Context adapter ───────────────────────────────────────────────────────────

/**
 * Wraps a raw Phaser Graphics OR HTML5 Canvas 2D context into a
 * unified drawing interface: fill(hex), rect(x,y,w,h), circle(cx,cy,r).
 */
function createCtx(rawCtx) {
  // Phaser Graphics exposes fillStyle as a method; Canvas 2D as a string property.
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
      if (isPhaser) {
        rawCtx.fillCircle(Math.round(cx), Math.round(cy), Math.round(r));
      } else {
        rawCtx.beginPath();
        rawCtx.arc(Math.round(cx), Math.round(cy), Math.round(r), 0, Math.PI * 2);
        rawCtx.fill();
      }
    },
  };
}

// ── Palette helpers ───────────────────────────────────────────────────────────

function pal(colorName) {
  return ColorPalette[colorName?.toLowerCase()] ?? null;
}

// ── Main drawing function ─────────────────────────────────────────────────────

/**
 * drawWrestler(rawCtx, wrestler, options)
 *
 * Draws the wrestler into rawCtx starting at (0,0).
 * @param {object} options
 *   width  — override draw width  (default: computeSize().w)
 *   height — override draw height (default: computeSize().h)
 *   victory — boolean, if true draw arms-raised pose
 */
export function drawWrestler(rawCtx, wrestler, options = {}) {
  const { appearance, physical } = wrestler;
  const natural = computeSize(wrestler);
  const W = options.width  ?? natural.w;
  const H = options.height ?? natural.h;
  const victory = options.victory ?? false;

  const ctx = createCtx(rawCtx);

  // ── Proportional zones (top=0, bottom=H) ─────────────────────────────────
  // Head: top 22%  → y [0, H*0.22]
  // Torso: 22–57%  → [H*0.22, H*0.57]
  // Legs: 57–93%   → [H*0.57, H*0.93]
  // Feet: 93–100%  → [H*0.93, H]

  const headTop    = 0;
  const headH      = Math.round(H * 0.22);
  const torsoTop   = headH;
  const torsoH     = Math.round(H * 0.35);
  const legsTop    = torsoTop + torsoH;
  const legsH      = Math.round(H * 0.36);
  const feetTop    = legsTop + legsH;
  const feetH      = H - feetTop;

  const skinPal    = pal(physical.skin_color);
  const costumePal = pal(appearance.costume_color);
  const footwearPal = pal(appearance.footwear_color);
  const hairPal    = pal(appearance.hair_color);
  const accessPal  = pal(appearance.accessory_color);

  const isSinglet  = (appearance.costume_type ?? '').toLowerCase() === 'singlet';

  // ── Legs ──────────────────────────────────────────────────────────────────
  const legW = Math.max(3, Math.round(W * 0.38));
  const gap  = Math.max(1, Math.round(W * 0.06));
  const leftLegX  = Math.round((W / 2) - legW - gap / 2);
  const rightLegX = Math.round((W / 2) + gap / 2);

  // Singlet covers legs; trunks exposes bare legs
  const legColor = isSinglet ? costumePal : skinPal;
  if (legColor) {
    ctx.fill(legColor.base);
    ctx.rect(leftLegX,  legsTop, legW, legsH);
    ctx.rect(rightLegX, legsTop, legW, legsH);
    // Highlight strip on outer edge of each leg
    ctx.fill(legColor.highlight);
    ctx.rect(leftLegX,  legsTop, 2, legsH);
    ctx.rect(rightLegX + legW - 2, legsTop, 2, legsH);
    // Shadow strip on inner edge
    ctx.fill(legColor.shadow);
    ctx.rect(leftLegX + legW - 2, legsTop, 2, legsH);
    ctx.rect(rightLegX, legsTop, 2, legsH);
  }

  // ── Footwear ──────────────────────────────────────────────────────────────
  if (footwearPal && feetH > 0) {
    const shoeH = appearance.footwear_type === 'boots' ? feetH + Math.round(legsH * 0.18) : feetH;
    const shoeTop = H - shoeH;
    ctx.fill(footwearPal.base);
    ctx.rect(leftLegX,  shoeTop, legW, shoeH);
    ctx.rect(rightLegX, shoeTop, legW, shoeH);
    ctx.fill(footwearPal.highlight);
    ctx.rect(leftLegX,  shoeTop, legW, 2);
    ctx.rect(rightLegX, shoeTop, legW, 2);
  }

  // ── Torso ─────────────────────────────────────────────────────────────────
  const torsoX = Math.round(W * 0.05);
  const torsoW = W - torsoX * 2;

  if (costumePal) {
    ctx.fill(costumePal.base);
    ctx.rect(torsoX, torsoTop, torsoW, torsoH);
    // Highlight strip (left side)
    ctx.fill(costumePal.highlight);
    ctx.rect(torsoX, torsoTop, Math.max(2, Math.round(torsoW * 0.12)), torsoH);
    // Shadow strip (right side)
    ctx.fill(costumePal.shadow);
    ctx.rect(torsoX + torsoW - Math.max(2, Math.round(torsoW * 0.12)), torsoTop, Math.max(2, Math.round(torsoW * 0.12)), torsoH);
  }

  // Singlet: no exposed trunks area; trunks: draw waistband at torso bottom
  if (!isSinglet && costumePal) {
    // Trunks sit in lower portion of torso area
    const trunksH = Math.round(torsoH * 0.55);
    const trunksTop = torsoTop + torsoH - trunksH;
    ctx.fill(costumePal.base);
    ctx.rect(torsoX, trunksTop, torsoW, trunksH);
    // Draw bare skin above trunks
    if (skinPal) {
      const skinTorsoH = torsoH - trunksH;
      ctx.fill(skinPal.base);
      ctx.rect(torsoX, torsoTop, torsoW, skinTorsoH);
      ctx.fill(skinPal.highlight);
      ctx.rect(torsoX, torsoTop, Math.max(2, Math.round(torsoW * 0.12)), skinTorsoH);
      ctx.fill(skinPal.shadow);
      ctx.rect(torsoX + torsoW - Math.max(2, Math.round(torsoW * 0.12)), torsoTop, Math.max(2, Math.round(torsoW * 0.12)), skinTorsoH);
    }
  }

  // ── Arms ──────────────────────────────────────────────────────────────────
  const armW = Math.max(2, Math.round(W * 0.13));
  const armH = Math.round(torsoH * 0.80);
  const armColor = skinPal;

  if (armColor) {
    if (victory) {
      // Arms raised: extend upward from torso top, angled outward
      const armRaisedH = Math.round(torsoH * 0.95);
      ctx.fill(armColor.base);
      ctx.rect(torsoX - armW, torsoTop - armRaisedH + Math.round(armRaisedH * 0.3), armW, armRaisedH);
      ctx.rect(torsoX + torsoW, torsoTop - armRaisedH + Math.round(armRaisedH * 0.3), armW, armRaisedH);
    } else {
      // Arms at sides
      ctx.fill(armColor.base);
      ctx.rect(torsoX - armW, torsoTop + Math.round(torsoH * 0.08), armW, armH);
      ctx.rect(torsoX + torsoW, torsoTop + Math.round(torsoH * 0.08), armW, armH);
      ctx.fill(armColor.highlight);
      ctx.rect(torsoX - armW, torsoTop + Math.round(torsoH * 0.08), 2, armH);
      ctx.rect(torsoX + torsoW, torsoTop + Math.round(torsoH * 0.08), 2, armH);
    }
  }

  // ── Head ──────────────────────────────────────────────────────────────────
  const headR = Math.round(headH * 0.5);
  const headCX = Math.round(W / 2);
  const headCY = Math.round(headTop + headR);

  if (skinPal) {
    ctx.fill(skinPal.base);
    ctx.circle(headCX, headCY, headR);
    // Highlight on upper-left quarter of head
    ctx.fill(skinPal.highlight);
    ctx.circle(headCX - Math.round(headR * 0.2), headCY - Math.round(headR * 0.2), Math.round(headR * 0.35));
  }

  // ── Hair ──────────────────────────────────────────────────────────────────
  const hairstyle = (appearance.hairstyle ?? '').toLowerCase();
  if (hairPal && hairstyle !== 'none') {
    ctx.fill(hairPal.base);
    if (hairstyle === 'long') {
      // Long hair: cap + curtains hanging below head
      ctx.circle(headCX, headCY - Math.round(headR * 0.1), Math.round(headR * 0.85));
      // Side curtains
      const curtainW = Math.max(2, Math.round(headR * 0.45));
      const curtainH = Math.round(torsoH * 0.45);
      ctx.rect(headCX - headR - curtainW + 3, headCY, curtainW, curtainH);
      ctx.rect(headCX + headR - 3, headCY, curtainW, curtainH);
    } else if (hairstyle === 'medium') {
      // Medium: cap + short side pieces
      ctx.circle(headCX, headCY - Math.round(headR * 0.1), Math.round(headR * 0.8));
      const sideW = Math.max(2, Math.round(headR * 0.35));
      const sideH = Math.round(headH * 0.35);
      ctx.rect(headCX - headR - sideW + 3, headCY - Math.round(headR * 0.2), sideW, sideH);
      ctx.rect(headCX + headR - 3, headCY - Math.round(headR * 0.2), sideW, sideH);
    } else if (hairstyle === 'short') {
      // Short: just a cap on top
      ctx.circle(headCX, headCY - Math.round(headR * 0.15), Math.round(headR * 0.75));
    }
    // Highlight on hair
    ctx.fill(hairPal.highlight);
    ctx.circle(headCX - Math.round(headR * 0.25), headCY - Math.round(headR * 0.4), Math.round(headR * 0.25));
  }

  // ── Accessories ───────────────────────────────────────────────────────────
  const accessory = (appearance.accessory ?? '').toLowerCase();

  if (accessPal && accessory !== 'none') {
    ctx.fill(accessPal.base);

    if (accessory === 'wristbands') {
      // Small bands at the wrist end of each arm
      const bandH = Math.max(3, Math.round(armH * 0.18));
      const bandTop = torsoTop + Math.round(torsoH * 0.08) + armH - bandH;
      ctx.rect(torsoX - armW, bandTop, armW, bandH);
      ctx.rect(torsoX + torsoW, bandTop, armW, bandH);
      ctx.fill(accessPal.highlight);
      ctx.rect(torsoX - armW, bandTop, armW, 2);
      ctx.rect(torsoX + torsoW, bandTop, armW, 2);
    } else if (accessory === 'mask') {
      // Full-face mask: redraw head in mask color, leave eye strip in skin tone
      ctx.fill(accessPal.base);
      ctx.circle(headCX, headCY, headR);
      // Eye strip (slightly darker)
      if (skinPal) {
        ctx.fill(accessPal.shadow);
        const eyeH = Math.max(3, Math.round(headR * 0.28));
        ctx.rect(headCX - Math.round(headR * 0.7), headCY - Math.round(headR * 0.15), Math.round(headR * 1.4), eyeH);
      }
      // Highlight on mask
      ctx.fill(accessPal.highlight);
      ctx.circle(headCX - Math.round(headR * 0.2), headCY - Math.round(headR * 0.25), Math.round(headR * 0.3));
    } else if (accessory === 'weight belt') {
      // Thick horizontal band across waist (bottom of bare torso / top of trunks)
      const beltH = Math.max(4, Math.round(torsoH * 0.16));
      const beltTop = torsoTop + Math.round(torsoH * 0.42);
      ctx.rect(torsoX, beltTop, torsoW, beltH);
      ctx.fill(accessPal.highlight);
      ctx.rect(torsoX, beltTop, torsoW, 2);
      // Belt buckle
      const buckleW = Math.max(4, Math.round(torsoW * 0.2));
      ctx.fill('#d4aa30');
      ctx.rect(headCX - Math.round(buckleW / 2), beltTop + 1, buckleW, beltH - 2);
    } else if (accessory === 'headgear') {
      // Helmet-like band over top of head
      const gearH = Math.max(3, Math.round(headR * 0.5));
      ctx.rect(headCX - headR + 1, headCY - headR, headR * 2 - 2, gearH);
      // Chin strap sides
      ctx.rect(headCX - headR, headCY - Math.round(headR * 0.1), Math.max(2, Math.round(headR * 0.2)), Math.round(headR * 0.7));
      ctx.rect(headCX + headR - Math.max(2, Math.round(headR * 0.2)), headCY - Math.round(headR * 0.1), Math.max(2, Math.round(headR * 0.2)), Math.round(headR * 0.7));
      ctx.fill(accessPal.highlight);
      ctx.rect(headCX - headR + 1, headCY - headR, headR * 2 - 2, 2);
    } else if (accessory === 'kneepads') {
      // Rectangular pads on upper-shin area of each leg
      const padH = Math.max(4, Math.round(legsH * 0.28));
      const padTop = legsTop + Math.round(legsH * 0.08);
      ctx.rect(leftLegX,  padTop, legW, padH);
      ctx.rect(rightLegX, padTop, legW, padH);
      ctx.fill(accessPal.highlight);
      ctx.rect(leftLegX,  padTop, legW, 2);
      ctx.rect(rightLegX, padTop, legW, 2);
    }
  }
}
