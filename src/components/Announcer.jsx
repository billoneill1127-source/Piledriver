/**
 * Announcer.jsx
 *
 * Broadcast desk layout:
 *   [Commentary box] [Chip + Bobby seated at table]
 *
 * The commentary box sits to the left like a broadcast lower-third.
 * The two announcers sit right next to each other behind a wood desk.
 * The active speaker leans toward the box (left); the idle speaker
 * leans slightly away (right).
 */

import { useState, useEffect, useRef } from 'react';

// ── Desk ──────────────────────────────────────────────────────────────────────

function Desk() {
  return (
    <svg width="160" height="28" viewBox="0 0 160 28" xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}>
      {/* Main surface */}
      <rect x="0" y="0" width="160" height="28" rx="3" fill="#4a2e0a" />
      {/* Top highlight edge */}
      <rect x="0" y="0" width="160" height="5" rx="3" fill="#6b4518" />
      {/* Bottom shadow */}
      <rect x="2" y="23" width="156" height="4" rx="1" fill="#2d1a06" />
    </svg>
  );
}

// ── Seated figure components ───────────────────────────────────────────────────
// lean: 'toward' | 'away' | 'neutral'
// 'toward' = lean left (toward commentary box): translateX(-12px) scale(1.08)
// 'away'   = lean right: translateX(4px)

function ChipChesswick({ lean }) {
  const t = lean === 'toward' ? 'rotate(5deg) translateX(-12px) scale(1.08)'
          : lean === 'away'   ? 'rotate(5deg) translateX(4px)'
          :                     'rotate(5deg)';
  return (
    <div style={{ transform: t, transition: 'transform 300ms ease', transformOrigin: 'bottom center' }}>
      <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}>
        {/* Head */}
        <ellipse cx="20" cy="13" rx="9" ry="10" fill="#f4c07a" />
        {/* Brown hair */}
        <ellipse cx="20" cy="5"  rx="9" ry="5"  fill="#5c3a1e" />
        {/* Headset band */}
        <path d="M 10,13 Q 20,1 30,13" stroke="#444" strokeWidth="2" fill="none" />
        <ellipse cx="10" cy="13" rx="3" ry="3" fill="#333" />
        <ellipse cx="30" cy="13" rx="3" ry="3" fill="#333" />
        {/* Red jacket */}
        <rect x="5" y="25" width="30" height="25" rx="3" fill="#cc2222" />
        {/* White shirt */}
        <rect x="15" y="25" width="10" height="18" fill="#ffffff" />
        {/* Tie */}
        <polygon points="20,29 17,43 23,43" fill="#cc2222" />
        {/* Lapels */}
        <polygon points="15,25 7,25 15,35" fill="#aa1111" />
        <polygon points="25,25 33,25 25,35" fill="#aa1111" />
      </svg>
    </div>
  );
}

function BobbyDonovan({ lean }) {
  const t = lean === 'toward' ? 'rotate(-5deg) translateX(-12px) scale(1.08)'
          : lean === 'away'   ? 'rotate(-5deg) translateX(4px)'
          :                     'rotate(-5deg)';
  return (
    <div style={{ transform: t, transition: 'transform 300ms ease', transformOrigin: 'bottom center' }}>
      <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}>
        {/* Head */}
        <ellipse cx="20" cy="13" rx="9" ry="10" fill="#f4c07a" />
        {/* Grey/silver hair */}
        <ellipse cx="20" cy="5"  rx="9" ry="5"  fill="#8a8a8a" />
        <rect x="11" y="4" width="18" height="5" rx="2" fill="#6a6a6a" />
        {/* Headset band */}
        <path d="M 10,13 Q 20,1 30,13" stroke="#444" strokeWidth="2" fill="none" />
        <ellipse cx="10" cy="13" rx="3" ry="3" fill="#333" />
        <ellipse cx="30" cy="13" rx="3" ry="3" fill="#333" />
        {/* Purple jacket */}
        <rect x="5" y="25" width="30" height="25" rx="3" fill="#6a2fa0" />
        {/* White shirt */}
        <rect x="15" y="25" width="10" height="18" fill="#ffffff" />
        {/* Tie */}
        <polygon points="20,29 17,43 23,43" fill="#6a2fa0" />
        {/* Lapels */}
        <polygon points="15,25 7,25 15,35" fill="#4a1f70" />
        <polygon points="25,25 33,25 25,35" fill="#4a1f70" />
      </svg>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function Announcer({ commentaryLine, commentarySpeaker }) {
  const [displayLine,    setDisplayLine]    = useState('');
  const [displaySpeaker, setDisplaySpeaker] = useState('CHIP');
  const [visible,        setVisible]        = useState(false);
  const prevLineRef = useRef('');

  useEffect(() => {
    if (!commentaryLine || commentaryLine === prevLineRef.current) return;
    prevLineRef.current = commentaryLine;

    setVisible(false);
    const swap = setTimeout(() => {
      setDisplayLine(commentaryLine);
      setDisplaySpeaker(commentarySpeaker ?? 'CHIP');
      setVisible(true);
    }, 150);

    return () => clearTimeout(swap);
  }, [commentaryLine, commentarySpeaker]);

  const chipLean  = visible ? (displaySpeaker === 'CHIP'  ? 'toward' : 'away') : 'neutral';
  const bobbyLean = visible ? (displaySpeaker === 'BOBBY' ? 'toward' : 'away') : 'neutral';

  return (
    <div style={{
      position:      'absolute',
      bottom:        48,
      left:          4,
      width:         380,
      display:       'flex',
      alignItems:    'flex-end',
      gap:           8,
      pointerEvents: 'none',
      userSelect:    'none',
    }}>

      {/* ── Commentary box — left of the desk ── */}
      <div style={{ width: 200, flexShrink: 0, paddingBottom: 43 }}>
        <div style={{
          background:     '#1a1a2e',
          border:         '1px solid #d4af37',
          borderRadius:   6,
          padding:        '8px 10px',
          minHeight:      62,
          display:        'flex',
          flexDirection:  'column',
          justifyContent: 'center',
          opacity:        visible ? 1 : 0,
          transition:     'opacity 300ms ease',
        }}>
          <div style={{
            color:         '#d4af37',
            fontSize:      '11px',
            fontFamily:    'monospace',
            fontWeight:    'bold',
            marginBottom:  4,
            letterSpacing: 1,
          }}>
            {displaySpeaker}:
          </div>
          <div style={{
            color:      '#ffffff',
            fontSize:   '13px',
            fontFamily: 'monospace',
            lineHeight: 1.4,
          }}>
            {displayLine}
          </div>
        </div>
      </div>

      {/* ── Desk + figures ── */}
      <div style={{ flexShrink: 0, width: 172, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Figures side-by-side, no gap */}
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <ChipChesswick lean={chipLean} />
          <BobbyDonovan  lean={bobbyLean} />
        </div>
        {/* Desk overlaps the figure bottoms slightly */}
        <div style={{ marginTop: -10, width: 160 }}>
          <Desk />
        </div>
        {/* Name labels */}
        <div style={{
          display:        'flex',
          width:          160,
          justifyContent: 'space-around',
          marginTop:      4,
          fontFamily:     'monospace',
          fontSize:       '9px',
          letterSpacing:  1,
        }}>
          <span style={{ color: '#cc4444' }}>CHIP</span>
          <span style={{ color: '#9966cc' }}>BOBBY</span>
        </div>
      </div>

    </div>
  );
}
