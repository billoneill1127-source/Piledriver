/**
 * Announcer.jsx
 *
 * Two announcer SVG figures centered at the bottom of the overlay with a
 * commentary text box between them. A new line fades in and the active
 * speaker leans inward; the idle speaker leans slightly away.
 * Speakers alternate each line.
 */

import { useState, useEffect, useRef } from 'react';

// lean: 'toward' | 'away' | 'neutral'
const chipTransform = {
  toward:  'translateX(14px) scale(1.08)',
  away:    'translateX(-4px)',
  neutral: 'translateX(0)',
};
const bobbyTransform = {
  toward:  'scaleX(-1) translateX(14px) scale(1.08)',
  away:    'scaleX(-1) translateX(-4px)',
  neutral: 'scaleX(-1)',
};

// ── SVG Figures ──────────────────────────────────────────────────────────────

function ChipChesswick({ lean }) {
  // Red suit, left side, faces right
  return (
    <svg width="52" height="90" viewBox="0 0 52 90" xmlns="http://www.w3.org/2000/svg"
      style={{
        display: 'block',
        transform: chipTransform[lean] ?? chipTransform.neutral,
        transition: 'transform 400ms ease',
      }}>
      {/* Head */}
      <ellipse cx="26" cy="14" rx="10" ry="12" fill="#f4c07a" />
      {/* Hair */}
      <ellipse cx="26" cy="5" rx="10" ry="5" fill="#5c3a1e" />
      {/* Suit jacket */}
      <rect x="11" y="28" width="30" height="34" rx="4" fill="#cc2222" />
      {/* White shirt / tie area */}
      <rect x="22" y="28" width="8" height="20" fill="#ffffff" />
      <polygon points="26,34 23,50 29,50" fill="#cc2222" />
      {/* Arms */}
      <rect x="4" y="29" width="9" height="22" rx="4" fill="#cc2222" />
      <rect x="39" y="29" width="9" height="22" rx="4" fill="#cc2222" />
      {/* Hands */}
      <ellipse cx="8"  cy="52" rx="5" ry="5" fill="#f4c07a" />
      <ellipse cx="44" cy="52" rx="5" ry="5" fill="#f4c07a" />
      {/* Microphone in right hand */}
      <rect x="40" y="54" width="5" height="12" rx="2" fill="#888" />
      <ellipse cx="42" cy="54" rx="4" ry="4" fill="#555" />
      {/* Trousers */}
      <rect x="14" y="60" width="11" height="26" rx="3" fill="#881111" />
      <rect x="27" y="60" width="11" height="26" rx="3" fill="#881111" />
      {/* Shoes */}
      <ellipse cx="19" cy="87" rx="8" ry="4" fill="#222" />
      <ellipse cx="33" cy="87" rx="8" ry="4" fill="#222" />
    </svg>
  );
}

function BobbyDonovan({ lean }) {
  // Purple suit, right side, faces left (mirror via scaleX)
  return (
    <svg width="52" height="90" viewBox="0 0 52 90" xmlns="http://www.w3.org/2000/svg"
      style={{
        display: 'block',
        transform: bobbyTransform[lean] ?? bobbyTransform.neutral,
        transition: 'transform 400ms ease',
      }}>
      {/* Head */}
      <ellipse cx="26" cy="14" rx="10" ry="12" fill="#f4c07a" />
      {/* Hair — slicked back */}
      <ellipse cx="26" cy="5" rx="10" ry="5" fill="#1a1a1a" />
      <rect x="16" y="4" width="20" height="6" rx="2" fill="#1a1a1a" />
      {/* Suit jacket */}
      <rect x="11" y="28" width="30" height="34" rx="4" fill="#6a2fa0" />
      {/* White shirt / tie area */}
      <rect x="22" y="28" width="8" height="20" fill="#ffffff" />
      <polygon points="26,34 23,50 29,50" fill="#6a2fa0" />
      {/* Arms */}
      <rect x="4" y="29" width="9" height="22" rx="4" fill="#6a2fa0" />
      <rect x="39" y="29" width="9" height="22" rx="4" fill="#6a2fa0" />
      {/* Hands */}
      <ellipse cx="8"  cy="52" rx="5" ry="5" fill="#f4c07a" />
      <ellipse cx="44" cy="52" rx="5" ry="5" fill="#f4c07a" />
      {/* Microphone */}
      <rect x="40" y="54" width="5" height="12" rx="2" fill="#888" />
      <ellipse cx="42" cy="54" rx="4" ry="4" fill="#555" />
      {/* Trousers */}
      <rect x="14" y="60" width="11" height="26" rx="3" fill="#4a1f70" />
      <rect x="27" y="60" width="11" height="26" rx="3" fill="#4a1f70" />
      {/* Shoes */}
      <ellipse cx="19" cy="87" rx="8" ry="4" fill="#222" />
      <ellipse cx="33" cy="87" rx="8" ry="4" fill="#222" />
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function Announcer({ commentaryLine }) {
  const [displayLine, setDisplayLine] = useState('');
  const [visible,     setVisible]     = useState(false);
  const [speaker,     setSpeaker]     = useState(0); // 0 = Chip, 1 = Bobby
  const prevLineRef = useRef('');

  useEffect(() => {
    if (!commentaryLine || commentaryLine === prevLineRef.current) return;
    prevLineRef.current = commentaryLine;

    // Fade out, swap text, fade in
    setVisible(false);
    const swap = setTimeout(() => {
      setDisplayLine(commentaryLine);
      setSpeaker(prev => 1 - prev);
      setVisible(true);
    }, 150);

    return () => clearTimeout(swap);
  }, [commentaryLine]);

  const chipLean  = visible ? (speaker === 0 ? 'toward' : 'away') : 'neutral';
  const bobbyLean = visible ? (speaker === 1 ? 'toward' : 'away') : 'neutral';

  return (
    <div style={{
      position:   'absolute',
      bottom:     20,
      left:       '50%',
      transform:  'translateX(-50%)',
      width:      340,
      display:    'flex',
      alignItems: 'flex-end',
      pointerEvents: 'none',
      userSelect: 'none',
    }}>
      {/* Chip Chesswick — left */}
      <div style={{ flexShrink: 0 }}>
        <ChipChesswick lean={chipLean} />
        <div style={{
          textAlign:  'center',
          fontSize:   '9px',
          color:      '#cc4444',
          fontFamily: 'monospace',
          marginTop:  2,
        }}>CHIP</div>
      </div>

      {/* Commentary box — 220px between the two figures */}
      <div style={{
        width:          220,
        flexShrink:     0,
        margin:         '0 4px 8px',
        padding:        '8px 10px',
        background:     'rgba(0,0,0,0.78)',
        border:         '1px solid rgba(255,255,255,0.15)',
        borderRadius:   6,
        minHeight:      40,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        opacity:        visible ? 1 : 0,
        transition:     'opacity 300ms ease',
      }}>
        <span style={{
          fontFamily: 'monospace',
          fontSize:   '12px',
          color:      speaker === 0 ? '#ff9999' : '#cc99ff',
          textAlign:  'center',
          lineHeight: 1.4,
        }}>
          {displayLine}
        </span>
      </div>

      {/* Bobby "The Brain" Donovan — right */}
      <div style={{ flexShrink: 0 }}>
        <BobbyDonovan lean={bobbyLean} />
        <div style={{
          textAlign:  'center',
          fontSize:   '9px',
          color:      '#9966cc',
          fontFamily: 'monospace',
          marginTop:  2,
        }}>BOBBY</div>
      </div>
    </div>
  );
}
