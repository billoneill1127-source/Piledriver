import { useState } from 'react';
import wrestlersData from '../data/wrestlers.json';

// ── Stat definitions ────────────────────────────────────────────────────────

const STATS = [
  { key: 'strength',  label: 'STR', color: '#ff6b35' },
  { key: 'size',      label: 'SIZ', color: '#b975e0' },
  { key: 'speed',     label: 'SPD', color: '#4fc3f7' },
  { key: 'agility',   label: 'AGI', color: '#4caf50' },
  { key: 'brains',    label: 'BRN', color: '#ffd54f' },
  { key: 'stamina',   label: 'STA', color: '#ef5350' },
  { key: 'toughness', label: 'TGH', color: '#26c6da' },
];

function fmtHeight(inches) {
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

// ── Sub-components ───────────────────────────────────────────────────────────

/**
 * Crops the first idle frame (top-left 32×32) of the sprite sheet and
 * renders it at 4× scale (128×128px) using real CSS dimensions so layout
 * space matches visual size — no transform: scale() tricks.
 *
 * The full sheet is 96×160px. At 4× the sheet renders as 384×640px, so
 * the first 32×32 frame occupies the top-left 128×128px of the image —
 * exactly what the overflow:hidden clip exposes.
 */
function WrestlerPreview({ wrestler }) {
  return (
    <div style={{
      width: 128,
      height: 128,
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      <img
        src={`${import.meta.env.BASE_URL}sprites/${wrestler.id}.png`}
        alt={wrestler.name}
        style={{
          imageRendering: 'pixelated',
          display: 'block',
          width: 384,   // 96px sheet × 4 = 4× scale
        }}
      />
    </div>
  );
}

function StatBar({ value, color }) {
  return (
    <div style={{
      flex: 1,
      height: 10,
      background: '#1a1a30',
      overflow: 'hidden',
      border: '1px solid #2a2a44',
    }}>
      <div style={{ width: `${value}%`, height: '100%', background: color }} />
    </div>
  );
}

function WrestlerCard({ wrestler, selected, disabled, accentColor, onSelect }) {
  const { name, attrs, physical } = wrestler;

  return (
    <div
      onClick={disabled ? undefined : onSelect}
      style={{
        background: selected ? '#0c1e38' : '#14142a',
        border: `2px solid ${selected ? accentColor : disabled ? '#222240' : '#2a2a4a'}`,
        padding: '14px 16px',
        marginBottom: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        userSelect: 'none',
        transition: 'border-color 0.1s, background 0.1s',
        display: 'flex',
        gap: 18,
        alignItems: 'flex-start',
      }}
    >
      {/* Sprite preview — 128×128px pixel art */}
      <WrestlerPreview wrestler={wrestler} />

      {/* Name + stats */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name */}
        <div style={{
          color: selected ? accentColor : '#e0d8a0',
          fontSize: 26,
          fontWeight: 'bold',
          letterSpacing: 1,
          marginBottom: 4,
          lineHeight: 1.1,
        }}>
          {name}
        </div>

        {/* Physical summary */}
        <div style={{ color: '#70708a', fontSize: 14, marginBottom: 12, letterSpacing: 0.5 }}>
          {physical.build} · {fmtHeight(physical.height_in)} · {physical.weight_lb} lbs
        </div>

        {/* Stat grid — two columns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: 16,
          rowGap: 7,
        }}>
          {STATS.map(({ key, label, color }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ color: '#60607a', fontSize: 14, width: 30, textAlign: 'right', flexShrink: 0, letterSpacing: 0.5 }}>
                {label}
              </span>
              <StatBar value={attrs[key]} color={color} />
              <span style={{ color: '#80809a', fontSize: 14, width: 26, textAlign: 'right', flexShrink: 0 }}>
                {attrs[key]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CpuToggle({ on, onToggle }) {
  return (
    <label
      style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}
      onClick={onToggle}
    >
      <span style={{ color: on ? '#ff4444' : '#50506a', fontSize: 9, letterSpacing: 1 }}>
        CPU
      </span>
      <div style={{
        width: 34,
        height: 18,
        background: on ? '#992222' : '#1e1e38',
        border: `1px solid ${on ? '#ff4444' : '#3a3a5a'}`,
        borderRadius: 9,
        position: 'relative',
        transition: 'background 0.15s, border-color 0.15s',
      }}>
        <div style={{
          position: 'absolute',
          top: 3,
          left: on ? 17 : 3,
          width: 10,
          height: 10,
          background: on ? '#ff4444' : '#50506a',
          borderRadius: '50%',
          transition: 'left 0.15s, background 0.15s',
        }} />
      </div>
    </label>
  );
}

function PlayerPanel({ label, playerNum, selectedId, opponentId, p2IsCPU, onSelect, onToggleCPU }) {
  const accentColor = playerNum === 1 ? '#00aaff' : '#ff4444';
  const wrestlers   = wrestlersData.wrestlers;

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: '#0b0b1c',
      border: `2px solid ${accentColor}33`,
      padding: 16,
      minWidth: 0,
      minHeight: 0,
    }}>
      {/* Panel header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
        paddingBottom: 10,
        borderBottom: `1px solid ${accentColor}22`,
      }}>
        <span style={{
          color: accentColor,
          fontSize: 18,
          fontWeight: 'bold',
          letterSpacing: 3,
        }}>
          {label}
        </span>
        {playerNum === 2 && (
          <CpuToggle on={p2IsCPU} onToggle={onToggleCPU} />
        )}
      </div>

      {/* Scrollable wrestler list */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
        {wrestlers.map(w => (
          <WrestlerCard
            key={w.id}
            wrestler={w}
            selected={selectedId === w.id}
            disabled={opponentId === w.id}
            accentColor={accentColor}
            onSelect={() => onSelect(w.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function WrestlerSelect({ onStartMatch }) {
  const [p1Id, setP1Id] = useState(null);
  const [p2Id, setP2Id] = useState(null);
  const [p2IsCPU, setP2IsCPU] = useState(true);

  const canStart = Boolean(p1Id && p2Id);

  function handleStart() {
    if (!canStart) return;
    onStartMatch({ player1: p1Id, player2: p2Id, p2IsCPU });
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#08080f',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"Courier New", Courier, monospace',
      padding: 20,
      boxSizing: 'border-box',
      gap: 20,
    }}>
      {/* Title */}
      <h1 style={{
        margin: 0,
        textAlign: 'center',
        color: '#ffd700',
        fontSize: 20,
        letterSpacing: 5,
        textShadow: '0 0 24px #ffd70055',
        flexShrink: 0,
      }}>
        ▶ CHOOSE YOUR WRESTLER ◀
      </h1>

      {/* Two-panel layout */}
      <div style={{
        display: 'flex',
        gap: 16,
        flex: 1,
        minHeight: 0,
        maxHeight: 'calc(100vh - 140px)',
      }}>
        <PlayerPanel
          label="PLAYER 1"
          playerNum={1}
          selectedId={p1Id}
          opponentId={p2Id}
          onSelect={setP1Id}
        />
        <PlayerPanel
          label="PLAYER 2"
          playerNum={2}
          selectedId={p2Id}
          opponentId={p1Id}
          p2IsCPU={p2IsCPU}
          onSelect={setP2Id}
          onToggleCPU={() => setP2IsCPU(v => !v)}
        />
      </div>

      {/* Start button */}
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <button
          onClick={handleStart}
          disabled={!canStart}
          style={{
            padding: '12px 52px',
            fontSize: 14,
            letterSpacing: 4,
            fontFamily: '"Courier New", Courier, monospace',
            fontWeight: 'bold',
            background: canStart ? '#ffd700' : '#12121f',
            color:      canStart ? '#08080f' : '#35354a',
            border:     `2px solid ${canStart ? '#ffd700' : '#22223a'}`,
            cursor:     canStart ? 'pointer' : 'not-allowed',
            textTransform: 'uppercase',
            transition: 'background 0.15s, color 0.15s, border-color 0.15s',
          }}
        >
          ▶ START MATCH
        </button>
      </div>
    </div>
  );
}
