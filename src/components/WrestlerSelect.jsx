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
 * Renders the first idle frame (top-left 32×32 crop) of a wrestler's
 * sprite sheet as a 2× scaled pixel-art preview.
 */
function WrestlerPreview({ wrestler }) {
  return (
    <div style={{
      width: 32,
      height: 32,
      overflow: 'hidden',
      imageRendering: 'pixelated',
      transform: 'scale(2)',
      transformOrigin: 'top left',
      flexShrink: 0,
    }}>
      <img
        src={`/src/assets/sprites/${wrestler.id}.png`}
        alt={wrestler.name}
        style={{
          imageRendering: 'pixelated',
          display: 'block',
        }}
      />
    </div>
  );
}

function StatBar({ value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{
        flex: 1,
        height: 7,
        background: '#1a1a30',
        overflow: 'hidden',
        border: '1px solid #2a2a44',
      }}>
        <div style={{ width: `${value}%`, height: '100%', background: color }} />
      </div>
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
        padding: '10px 12px',
        marginBottom: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        userSelect: 'none',
        transition: 'border-color 0.1s, background 0.1s',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      {/* Sprite preview */}
      <WrestlerPreview wrestler={wrestler} />

      {/* Name + stats */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name */}
        <div style={{
          color: selected ? accentColor : '#e0d8a0',
          fontSize: 12,
          fontWeight: 'bold',
          letterSpacing: 1,
          marginBottom: 3,
        }}>
          {name}
        </div>

        {/* Physical summary */}
        <div style={{ color: '#70708a', fontSize: 9, marginBottom: 9, letterSpacing: 0.5 }}>
          {physical.build} · {fmtHeight(physical.height_in)} · {physical.weight_lb} lbs
        </div>

        {/* Stat bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {STATS.map(({ key, label, color }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#60607a', fontSize: 8, width: 20, textAlign: 'right', flexShrink: 0, letterSpacing: 0.5 }}>
                {label}
              </span>
              <StatBar value={attrs[key]} color={color} />
              <span style={{ color: '#80809a', fontSize: 8, width: 18, textAlign: 'right', flexShrink: 0 }}>
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
          fontSize: 12,
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
