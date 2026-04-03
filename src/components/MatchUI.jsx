/**
 * MatchUI.jsx
 *
 * React overlay (800×600, position:absolute) on top of the Phaser canvas.
 * Handles all player input and displays match status. No engine calls here —
 * everything goes through the `match` object returned by useMatch.
 */

const FONT  = '"Courier New", Courier, monospace';
const P1C   = '#00aaff';
const P2C   = '#ff4444';
const GOLDC = '#ffd700';
const PANEL = 'rgba(6, 6, 18, 0.88)';

// ── Helpers ───────────────────────────────────────────────────────────────

function staminaColor(current, max) {
  const pct = current / max;
  if (pct > 0.5) return '#44cc44';
  if (pct > 0.25) return '#eecc00';
  return '#cc4444';
}

// ── Move button ───────────────────────────────────────────────────────────

function MoveBtn({ move, isOffense, selected, locked, accentColor, onSelect }) {
  const dimmed = locked && !selected;
  return (
    <button
      onClick={locked ? undefined : () => onSelect(move.id)}
      style={{
        display: 'block',
        width: '100%',
        padding: '5px 8px',
        marginBottom: 3,
        textAlign: 'left',
        background: selected ? `${accentColor}28` : 'transparent',
        border: `1px solid ${selected ? accentColor : '#1e1e36'}`,
        color: dimmed ? '#303048' : (selected ? accentColor : '#b0b0c8'),
        fontFamily: FONT,
        fontSize: 9,
        cursor: locked ? 'default' : 'pointer',
        letterSpacing: 0.3,
        pointerEvents: 'auto',
        transition: 'border-color 0.1s, color 0.1s',
        position: 'relative',
      }}
    >
      <span>{move.name}</span>
      {isOffense && (
        <span style={{ position: 'absolute', right: 8, color: dimmed ? '#303048' : '#ff8844' }}>
          {move.is_submission ? 'SUB' : `-${move.damage}`}
        </span>
      )}
    </button>
  );
}

// ── Stamina bar ───────────────────────────────────────────────────────────

function StaminaBar({ current, max, color, flip }) {
  const pct = Math.max(0, Math.min(1, current / max)) * 100;
  const barStyle = flip
    ? { position: 'absolute', right: 0, top: 0, width: `${pct}%`, height: '100%', background: color, transition: 'width 0.3s' }
    : { width: `${pct}%`, height: '100%', background: color, transition: 'width 0.3s' };
  return (
    <div style={{ flex: 1, height: 12, background: '#12122a', overflow: 'hidden', position: 'relative' }}>
      <div style={barStyle} />
    </div>
  );
}

// ── Top HUD ───────────────────────────────────────────────────────────────

function TopHud({ p1, p2, stamina, turnCount, offenseId }) {
  const p1Stam = stamina[p1.id];
  const p2Stam = stamina[p2.id];
  const p1Col  = staminaColor(p1Stam, p1.attrs.stamina);
  const p2Col  = staminaColor(p2Stam, p2.attrs.stamina);

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: 52,
      background: PANEL,
      borderBottom: '1px solid #1a1a3a',
      display: 'flex', alignItems: 'center',
      padding: '0 10px',
      boxSizing: 'border-box',
      gap: 8,
      fontFamily: FONT,
    }}>
      {/* P1 side */}
      <span style={{
        color: offenseId === p1.id ? P1C : '#4a6a7a',
        fontSize: 10, fontWeight: 'bold', letterSpacing: 1,
        width: 90, textAlign: 'right', flexShrink: 0,
        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
      }}>
        {offenseId === p1.id ? '⚔ ' : ''}{p1.name}
      </span>
      <StaminaBar current={p1Stam} max={p1.attrs.stamina} color={p1Col} />
      <span style={{ color: p1Col, fontSize: 10, width: 22, textAlign: 'right', flexShrink: 0 }}>
        {p1Stam}
      </span>

      {/* Center */}
      <div style={{ width: 80, textAlign: 'center', flexShrink: 0 }}>
        <div style={{ color: GOLDC, fontSize: 8, letterSpacing: 1 }}>TURN</div>
        <div style={{ color: '#ffffff', fontSize: 14, fontWeight: 'bold' }}>{turnCount}</div>
      </div>

      {/* P2 side */}
      <span style={{ color: p2Col, fontSize: 10, width: 22, textAlign: 'left', flexShrink: 0 }}>
        {p2Stam}
      </span>
      <StaminaBar current={p2Stam} max={p2.attrs.stamina} color={p2Col} flip />
      <span style={{
        color: offenseId === p2.id ? P2C : '#7a4a4a',
        fontSize: 10, fontWeight: 'bold', letterSpacing: 1,
        width: 90, textAlign: 'left', flexShrink: 0,
        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
      }}>
        {p2.name}{offenseId === p2.id ? ' ⚔' : ''}
      </span>
    </div>
  );
}

// ── Bottom HUD ────────────────────────────────────────────────────────────

function BottomHud({ offenseId, p1, p2, turnCount, log }) {
  const attackerName = offenseId === p1.id ? p1.name : p2.name;
  const accentColor  = offenseId === p1.id ? P1C : P2C;

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, width: '100%', height: 48,
      background: PANEL,
      borderTop: '1px solid #1a1a3a',
      display: 'flex', alignItems: 'center',
      padding: '0 12px',
      boxSizing: 'border-box',
      gap: 16,
      fontFamily: FONT,
    }}>
      <span style={{ color: accentColor, fontSize: 9, letterSpacing: 1, flexShrink: 0 }}>
        {attackerName.toUpperCase()} ATTACKING
      </span>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {log.slice(-3).reverse().map((entry, i) => (
          <div key={i} style={{
            color: i === 0 ? '#c0c0c0' : '#505060',
            fontSize: 8,
            letterSpacing: 0.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {entry}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Pin prompt ────────────────────────────────────────────────────────────

function PinPrompt({ defenderName, onDecision }) {
  const btnBase = {
    padding: '10px 28px',
    fontFamily: FONT,
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: 'bold',
    border: '2px solid',
    cursor: 'pointer',
    pointerEvents: 'auto',
  };

  return (
    <div style={{
      position: 'absolute',
      top: '38%', left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(4, 4, 14, 0.96)',
      border: `2px solid ${GOLDC}`,
      padding: '24px 40px',
      textAlign: 'center',
      pointerEvents: 'auto',
      zIndex: 10,
      minWidth: 300,
    }}>
      <div style={{ color: GOLDC, fontSize: 16, letterSpacing: 3, marginBottom: 22, fontFamily: FONT }}>
        GO FOR THE PIN?
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
        <button
          onClick={() => onDecision(true)}
          style={{ ...btnBase, background: '#184030', borderColor: '#44cc44', color: '#44cc44' }}
        >
          YES
        </button>
        <button
          onClick={() => onDecision(false)}
          style={{ ...btnBase, background: '#301818', borderColor: '#cc4444', color: '#cc4444' }}
        >
          NO
        </button>
      </div>
    </div>
  );
}

// ── Result banner ─────────────────────────────────────────────────────────

function ResultBanner({ lastResult }) {
  if (!lastResult) return null;
  const isMatchEnd = lastResult.matchOver;
  return (
    <div style={{
      position: 'absolute',
      top: '38%', left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(4, 4, 14, 0.95)',
      border: `2px solid ${isMatchEnd ? GOLDC : '#2a2a5a'}`,
      padding: '18px 36px',
      textAlign: 'center',
      pointerEvents: 'none',
      zIndex: 10,
      minWidth: 320,
    }}>
      <div style={{
        color: isMatchEnd ? GOLDC : '#e0e0e0',
        fontSize: isMatchEnd ? 15 : 13,
        letterSpacing: 1.5,
        fontFamily: FONT,
        lineHeight: 1.5,
      }}>
        {lastResult.description}
      </div>
    </div>
  );
}

// ── Move selection panels ─────────────────────────────────────────────────

function MovePanel({ label, moves, isOffense, selected, locked, accentColor, onSelect }) {
  return (
    <div style={{
      width: 186,
      height: '100%',
      background: PANEL,
      borderRight: label.startsWith('P1') ? '1px solid #1a1a3a' : 'none',
      borderLeft:  label.startsWith('P2') ? '1px solid #1a1a3a' : 'none',
      display: 'flex',
      flexDirection: 'column',
      pointerEvents: 'auto',
    }}>
      {/* Panel header */}
      <div style={{
        padding: '7px 8px',
        borderBottom: `1px solid ${accentColor}33`,
        color: accentColor,
        fontSize: 8,
        letterSpacing: 2,
        fontFamily: FONT,
        flexShrink: 0,
      }}>
        {label}
      </div>

      {/* Move list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 6px' }}>
        {moves.length === 0
          ? <div style={{ color: '#30304a', fontSize: 9, fontFamily: FONT, padding: 8 }}>No moves</div>
          : moves.map(m => (
              <MoveBtn
                key={m.id}
                move={m}
                isOffense={isOffense}
                selected={selected === m.id}
                locked={locked}
                accentColor={accentColor}
                onSelect={onSelect}
              />
            ))
        }
      </div>

      {/* Locked indicator */}
      {locked && selected && (
        <div style={{ padding: '6px 8px', borderTop: '1px solid #1a1a3a', color: accentColor, fontSize: 8, fontFamily: FONT, letterSpacing: 1 }}>
          ✓ LOCKED IN
        </div>
      )}
      {locked && !selected && (
        <div style={{ padding: '6px 8px', borderTop: '1px solid #1a1a3a', color: '#30304a', fontSize: 8, fontFamily: FONT }}>
          Selecting...
        </div>
      )}
    </div>
  );
}

function CpuStatusPanel({ label, hasSelected }) {
  return (
    <div style={{
      width: 186,
      height: '100%',
      background: PANEL,
      borderLeft: '1px solid #1a1a3a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      fontFamily: FONT,
    }}>
      <div style={{ color: P2C, fontSize: 8, letterSpacing: 2 }}>{label}</div>
      <div style={{ color: hasSelected ? '#44cc44' : '#505068', fontSize: 9, letterSpacing: 1 }}>
        {hasSelected ? 'CPU SELECTED.' : 'CPU THINKING...'}
      </div>
    </div>
  );
}

function MoveSelection({ p1, p2, p2IsCPU, match }) {
  const {
    availableOffenseMoves, availableDefenseMoves,
    pendingOffense, pendingDefense,
    selectOffenseMove, selectDefenseMove, p1IsAttacker,
  } = match;

  // P1 column: offense moves if P1 is attacker, defense moves if defender
  const p1Moves    = p1IsAttacker ? availableOffenseMoves : availableDefenseMoves;
  const p1IsOff    = p1IsAttacker;
  const p1Selected = p1IsAttacker ? pendingOffense : pendingDefense;
  const p1OnSelect = p1IsAttacker ? selectOffenseMove : selectDefenseMove;

  // P2 column (only used when P2 is human)
  const p2Moves    = p1IsAttacker ? availableDefenseMoves : availableOffenseMoves;
  const p2IsOff    = !p1IsAttacker;
  const p2Selected = p1IsAttacker ? pendingDefense : pendingOffense;
  const p2OnSelect = p1IsAttacker ? selectDefenseMove : selectOffenseMove;

  const p1Label = `P1 — ${p1IsOff ? 'OFFENSE' : 'DEFENSE'}`;
  const p2Label = `${p2IsCPU ? 'CPU' : 'P2'} — ${p2IsOff ? 'OFFENSE' : 'DEFENSE'}`;

  // Which pending slot belongs to CPU?
  const cpuSelected = p1IsAttacker ? pendingDefense : pendingOffense;

  return (
    <div style={{ position: 'absolute', top: 52, left: 0, width: '100%', height: 500, display: 'flex', justifyContent: 'space-between' }}>
      {/* P1 panel (left) */}
      <MovePanel
        label={p1Label}
        moves={p1Moves}
        isOffense={p1IsOff}
        selected={p1Selected}
        locked={p1Selected !== null}
        accentColor={P1C}
        onSelect={p1OnSelect}
      />

      {/* Transparent center — ring shows through */}
      <div style={{ flex: 1 }} />

      {/* P2 panel (right) — hidden move list when CPU */}
      {p2IsCPU
        ? <CpuStatusPanel label={p2Label} hasSelected={cpuSelected !== null} />
        : (
          <MovePanel
            label={p2Label}
            moves={p2Moves}
            isOffense={p2IsOff}
            selected={p2Selected}
            locked={p2Selected !== null}
            accentColor={P2C}
            onSelect={p2OnSelect}
          />
        )
      }
    </div>
  );
}

// ── Match over overlay ────────────────────────────────────────────────────

function MatchOverOverlay({ winner, p1, p2, onReturn }) {
  const winnerData = winner === p1.id ? p1 : p2;
  const winnerColor = winner === p1.id ? P1C : P2C;

  return (
    <div style={{
      position: 'fixed',        // fixed so it sits above EVERYTHING including Phaser canvas
      top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(2, 2, 10, 0.92)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 16,
      pointerEvents: 'auto',
      zIndex: 9999,             // guaranteed top-most
      fontFamily: FONT,
    }}>
      <div style={{ color: winnerColor, fontSize: 26, fontWeight: 'bold', letterSpacing: 4, textShadow: `0 0 30px ${winnerColor}` }}>
        {winnerData.name}
      </div>
      <div style={{ color: GOLDC, fontSize: 18, letterSpacing: 8 }}>
        WINS!
      </div>
      <div style={{ width: 200, height: 1, background: '#2a2a4a', margin: '8px 0' }} />
      <button
        onClick={onReturn}
        style={{
          padding: '12px 40px',
          fontFamily: FONT,
          fontSize: 12,
          letterSpacing: 3,
          fontWeight: 'bold',
          background: '#0a0a1a',
          color: GOLDC,
          border: `2px solid ${GOLDC}`,
          cursor: 'pointer',
          pointerEvents: 'auto',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#1a1400'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#0a0a1a'; }}
      >
        ◀ REMATCH / SELECT
      </button>
    </div>
  );
}

// ── Root MatchUI component ────────────────────────────────────────────────

export default function MatchUI({ p1, p2, p2IsCPU, match, onReturn }) {
  const {
    phase, stamina, offenseId, turnCount, winner, lastResult, log,
    availableOffenseMoves, availableDefenseMoves,
    handlePinDecision,
  } = match;

  const defenderName = offenseId === p1.id ? p2.name : p1.name;

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: 800, height: 600,
      pointerEvents: 'none',
      fontFamily: FONT,
      zIndex: 5,
    }}>
      {/* Top HUD — always visible */}
      <TopHud
        p1={p1} p2={p2}
        stamina={stamina}
        turnCount={turnCount}
        offenseId={offenseId}
      />

      {/* Phase-dependent center content */}
      {phase === 'pin_prompt' && (
        <PinPrompt defenderName={defenderName} onDecision={handlePinDecision} />
      )}

      {phase === 'selecting' && (
        <MoveSelection p1={p1} p2={p2} p2IsCPU={p2IsCPU} match={match} />
      )}

      {phase === 'result' && (
        <ResultBanner lastResult={lastResult} />
      )}

      {phase === 'match_over' && (
        <MatchOverOverlay winner={winner} p1={p1} p2={p2} onReturn={onReturn} />
      )}

      {/* Bottom HUD — hidden during match_over */}
      {phase !== 'match_over' && (
        <BottomHud
          offenseId={offenseId} p1={p1} p2={p2}
          turnCount={turnCount} log={log}
        />
      )}
    </div>
  );
}
