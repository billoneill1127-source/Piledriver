/**
 * useMatch.js
 *
 * React hook that owns the full match lifecycle. Initialises the engine
 * once, drives phase transitions, schedules CPU moves, and emits events
 * to the Phaser layer via MatchEvents.
 *
 * Phase state machine:
 *   'selecting'         — awaiting move selections (human + optional CPU)
 *   'pin_prompt'        — pin YES/NO offered to the offensive player
 *   'result'            — result banner visible (1500 ms, or 2000 ms for
 *                         submission wins, or 1000 ms for submission escapes)
 *   'submission_drama'  — second dramatic beat for double-check submissions
 *                         (2000 ms) before transitioning to match_over
 *   'match_over'        — terminal
 */

import { useState, useEffect, useRef } from 'react';
import wrestlersRaw from '../data/wrestlers.json';
import movesRaw     from '../data/moves.json';
import outcomesRaw  from '../data/outcomes.json';
import { DataLoader }      from '../engine/DataLoader.js';
import { MatchState }      from '../engine/MatchState.js';
import { OutcomeResolver } from '../engine/OutcomeResolver.js';
import { TurnManager }     from '../engine/TurnManager.js';
import { MatchEvents }     from '../engine/MatchEvents.js';

// ── Result description ─────────────────────────────────────────────────────

function describeResult(r, loader) {
  if (r.pinResult === true) return `${r.attackerName} pins ${r.defenderName}! 1...2...3!`;

  // Submission win: first drama banner depends on whether it's a double-check
  if (r.submissionResult === true) {
    return r.isDoubleCheckSub
      ? `${r.defenderName} is fading...`
      : `${r.defenderName} can't get out of it!`;
  }

  const parts = [];
  if (r.pinOffered && r.pinResult === false) parts.push(`${r.defenderName} kicks out!`);

  const moveName = loader.getMove(r.offenseMoveId)?.name ?? 'Move';
  switch (r.result) {
    case 'success':
      parts.push(`${moveName} connects! -${r.damage}`);
      break;
    case 'block':
      parts.push(`${moveName} blocked!`);
      break;
    case 'escape':
      parts.push(`${r.defenderName} escapes!`);
      break;
    case 'reversal':
      parts.push(`REVERSAL! ${r.counterMoveName} hits! -${r.damage}`);
      break;
    default:
      break;
  }
  return parts.join(' ') || 'Turn complete';
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useMatch({ p1, p2, p2IsCPU }) {
  // ── Stable engine objects ────────────────────────────────────────────────
  const engRef = useRef(null);
  if (!engRef.current) {
    MatchEvents.clear(); // clear any stale listeners from a previous match
    const loader   = new DataLoader(wrestlersRaw, movesRaw, outcomesRaw);
    const ms       = new MatchState(p1, p2);
    const resolver = new OutcomeResolver(loader);
    const tm       = new TurnManager(ms, resolver, loader);
    engRef.current = { loader, ms, tm };
  }
  const { loader, ms, tm } = engRef.current;

  // ── React state ──────────────────────────────────────────────────────────
  const [phase, setPhase] = useState(() =>
    tm.checkPinOpportunity() ? 'pin_prompt' : 'selecting',
  );
  const [stamina, setStamina] = useState({
    [p1.id]: p1.attrs.stamina,
    [p2.id]: p2.attrs.stamina,
  });
  const [offenseId, setOffenseId] = useState(ms.offensivePlayerId);
  const [turnCount, setTurnCount] = useState(0);
  const [winner,    setWinner]    = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [log, setLog] = useState([]);
  const [pendingOffense, setPendingOffense] = useState(null);
  const [pendingDefense, setPendingDefense] = useState(null);
  const [winNote, setWinNote] = useState(null);

  // Guard: prevents double-execute in React StrictMode
  const executingRef = useRef(false);

  // ── Derived ──────────────────────────────────────────────────────────────
  const matchOver  = winner !== null;
  const defenseId  = offenseId === p1.id ? p2.id : p1.id;
  const attacker   = loader.getWrestler(offenseId);
  const defender   = loader.getWrestler(defenseId);
  const p1IsAttacker = offenseId === p1.id;
  const availableOffenseMoves = loader.getAvailableMoves(attacker, 'Offense');
  const availableDefenseMoves = loader.getAvailableMoves(defender, 'Defense');

  // ── Core execution ───────────────────────────────────────────────────────
  function executeWithMoves(offId, defId, skipPin = false) {
    if (executingRef.current) return;
    executingRef.current = true;

    // Capture pre-turn context (these values become stale after setOffenseId)
    const preOffenseId   = offenseId;
    const preDefenseId   = defenseId;
    const preAttackerName = attacker.name;
    const preDefenderName = defender.name;

    setPendingOffense(null);
    setPendingDefense(null);

    if (skipPin) tm.lastDefenderId = null;
    let res;
    try {
      res = tm.executeTurn(offId, defId);
    } catch (err) {
      console.error('[useMatch] executeTurn threw:', err);
      executingRef.current = false;
      return;
    }

    // Build enriched result for display
    const offMove     = loader.getMove(offId);
    const counterMove = res.result === 'reversal' && offMove?.counter_move
      ? loader.getMove(offMove.counter_move)
      : null;
    // Double-check submission: attacker brains > defender brains (see MatchState)
    const isDoubleCheckSub = res.submissionResult === true &&
      attacker.attrs.brains > defender.attrs.brains;
    const enriched = {
      ...res,
      offenseMoveId:    offId,
      defenseMoveId:    defId,
      attackerId:       preOffenseId,
      defenderId:       preDefenseId,
      attackerName:     preAttackerName,
      defenderName:     preDefenderName,
      counterMoveName:  counterMove?.name ?? 'Counter Move',
      offMoveCategory:  offMove?.category ?? 'strike',
      isDoubleCheckSub,
    };
    enriched.description = describeResult(enriched, loader);

    // Sync React state with engine
    const newStamina = { [p1.id]: ms.getStamina(p1.id), [p2.id]: ms.getStamina(p2.id) };
    setStamina(newStamina);
    setTurnCount(tm.turnCount);
    setOffenseId(res.newOffensivePlayer);
    setLog(prev => [...prev.slice(-4), enriched.description]);
    setLastResult(enriched);
    setPhase('result');

    if (res.matchOver && res.winner) {
      setWinner(res.winner);
      if (res.submissionResult === true) setWinNote('by SUBMISSION');
    }

    // Emit Phaser events
    MatchEvents.emit('stamina', newStamina);

    // Flash only on success or reversal where damage actually landed —
    // blocks and escapes produce damage=0 so they never trigger the hit flash.
    if (enriched.damage > 0 && (enriched.result === 'success' || enriched.result === 'reversal')) {
      const damagedId = enriched.result === 'reversal' ? preOffenseId : preDefenseId;
      MatchEvents.emit('damage', { wrestlerId: damagedId, amount: enriched.damage });
    }

    MatchEvents.emit('turnResult', enriched);

    // NOTE: MatchEvents 'matchOver' is NOT emitted here. It is emitted inside
    // finishMatchOver (below) so the Phaser WINS banner and the React overlay
    // appear at exactly the same time — after all drama phases complete.

    // Result banner duration — varies by outcome
    const isSubEscape = offMove?.is_submission && !res.matchOver && res.result === 'escape';
    const resultDuration = enriched.submissionResult === true ? (isDoubleCheckSub ? 1500 : 2000)
      : isSubEscape ? 1000
      : 1500;

    // Final transition: Phaser matchOver event + React phase change together,
    // called only when ALL drama phases have completed.
    const finishMatchOver = () => {
      MatchEvents.emit('matchOver', {
        winner:     res.winner,
        winnerName: loader.getWrestler(res.winner)?.name ?? 'Winner',
      });
      setPhase('match_over');
    };

    // Advance phase after result banner — every match_over transition is
    // strictly chained: no setPhase('match_over') outside this callback tree.
    setTimeout(() => {
      executingRef.current = false;
      if (res.matchOver) {
        if (isDoubleCheckSub) {
          // Phase 2: drama banner "can't get out of it!" for 2000ms, then match over
          setPhase('submission_drama');
          setTimeout(finishMatchOver, 2000);
        } else {
          // Single-check sub (already waited 2000ms), pin, or other match-over
          finishMatchOver();
        }
      } else {
        setPhase(tm.checkPinOpportunity() ? 'pin_prompt' : 'selecting');
      }
    }, resultDuration);

    // Hard safety-net: force-unlock after 5000 ms to prevent permanent freeze.
    setTimeout(() => {
      if (executingRef.current) {
        console.warn('[useMatch] Safety-net fired — executingRef was still true after 5 s. Forcing phase advance.');
        executingRef.current = false;
        setPhase(res.matchOver ? 'match_over' : 'selecting');
      }
    }, 5000);
  }

  // ── CPU auto-selection ───────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'selecting' || matchOver || !p2IsCPU) return;

    const timer = setTimeout(() => {
      if (offenseId === p2.id) {
        setPendingOffense(tm.cpuSelectOffense(loader.getWrestler(p2.id)));
      } else {
        setPendingDefense(tm.cpuSelectDefense(loader.getWrestler(p2.id)));
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [phase, offenseId, p2IsCPU, matchOver]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── CPU auto-pin ─────────────────────────────────────────────────────────
  // When phase reaches 'pin_prompt' and the CPU is the current attacker,
  // skip the human prompt entirely and immediately execute the pin attempt.
  useEffect(() => {
    if (phase !== 'pin_prompt' || matchOver || !p2IsCPU || offenseId !== p2.id) return;
    const timer = setTimeout(() => {
      const cpuWrestler = loader.getWrestler(p2.id);
      const offId = tm.cpuSelectOffense(cpuWrestler);
      const defId = tm.cpuSelectDefense(loader.getWrestler(p1.id));
      executeWithMoves(offId, defId, false); // engine handles pin internally
    }, 400);
    return () => clearTimeout(timer);
  }, [phase, p2IsCPU, offenseId, matchOver]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-resolve when both moves chosen ──────────────────────────────────
  useEffect(() => {
    if (phase !== 'selecting' || !pendingOffense || !pendingDefense) return;
    executeWithMoves(pendingOffense, pendingDefense);
  }, [phase, pendingOffense, pendingDefense]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public API ───────────────────────────────────────────────────────────
  function selectOffenseMove(id) {
    if (phase === 'selecting' && !pendingOffense) setPendingOffense(id);
  }

  function selectDefenseMove(id) {
    if (phase === 'selecting' && !pendingDefense) setPendingDefense(id);
  }

  function handlePinDecision(accepted) {
    if (!accepted) {
      tm.lastDefenderId = null; // skip pin for this turn
      setPhase('selecting');
      return;
    }
    // Go for the pin — auto-select fallback moves in case pin fails
    const offId = tm.cpuSelectOffense(attacker);
    const defId = tm.cpuSelectDefense(defender);
    executeWithMoves(offId, defId, false); // engine handles pin internally
  }

  return {
    // Phase / status
    phase,
    matchOver,
    winner,
    winNote,
    turnCount,
    log,
    lastResult,
    // Stamina
    stamina,
    // Who is where
    offenseId,
    defenseId,
    p1IsAttacker,
    // Move lists (for current attacker/defender)
    availableOffenseMoves,
    availableDefenseMoves,
    // Per-turn pending selections
    pendingOffense,
    pendingDefense,
    // Actions
    selectOffenseMove,
    selectDefenseMove,
    handlePinDecision,
  };
}
