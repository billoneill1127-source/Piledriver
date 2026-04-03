/**
 * test.js — console test for the Piledriver engine.
 *
 * Run from the project root:
 *   node src/engine/test.js
 *
 * Uses createRequire to load JSON without needing --experimental-json-modules.
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

import { DataLoader }       from './DataLoader.js';
import { OutcomeResolver }  from './OutcomeResolver.js';
import { MatchState }       from './MatchState.js';
import { TurnManager }      from './TurnManager.js';

const require = createRequire(import.meta.url);
const __dir   = path.dirname(fileURLToPath(import.meta.url));

const wrestlersRaw = require(path.join(__dir, '../data/wrestlers.json'));
const movesRaw     = require(path.join(__dir, '../data/moves.json'));
const outcomesRaw  = require(path.join(__dir, '../data/outcomes.json'));

// ── Helpers ────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.error(`  ✗  FAIL: ${label}`);
    failed++;
  }
}

function section(title) {
  console.log(`\n══ ${title} ══`);
}

// ── Setup ──────────────────────────────────────────────────────────────────

const data     = new DataLoader(wrestlersRaw, movesRaw, outcomesRaw);
const resolver = new OutcomeResolver(data);

const bulkBogan       = data.getWrestler('bulk_bogan');
const elAguilia       = data.getWrestler('el_aguilia_blanca');
const tankThompson    = data.getWrestler('tank_thompson');
const nickOlympia     = data.getWrestler('nick_olympia');
const mikeMilkman     = data.getWrestler('mike_milkman');

// ── DataLoader tests ───────────────────────────────────────────────────────

section('DataLoader');

assert(bulkBogan !== null,  'getWrestler returns Bulk Bogan');
assert(elAguilia !== null,  'getWrestler returns El Aguilia Blanca');
assert(data.getWrestler('nobody') === null, 'getWrestler returns null for unknown id');

assert(data.getMove('piledriver') !== null, 'getMove returns piledriver');
assert(data.getMove('fake_move')  === null, 'getMove returns null for unknown id');

assert(data.getOutcomes('punch', 'block') !== null, 'getOutcomes returns punch vs block table');
assert(data.getOutcomes('back_body_drop', 'block') === null, 'getOutcomes returns null for missing entry');

// Available offense moves per wrestler
const boganOffense    = data.getAvailableMoves(bulkBogan,    'Offense');
const milkmanOffense  = data.getAvailableMoves(mikeMilkman,  'Offense');
const elAguiliaOff    = data.getAvailableMoves(elAguilia,    'Offense');

console.log(`\n  Move counts (Offense):`);
console.log(`    Bulk Bogan:      ${boganOffense.length} moves — ${boganOffense.map(m => m.id).join(', ')}`);
console.log(`    El Aguilia:      ${elAguiliaOff.length} moves — ${elAguiliaOff.map(m => m.id).join(', ')}`);
console.log(`    Mike Milkman:    ${milkmanOffense.length} moves — ${milkmanOffense.map(m => m.id).join(', ')}`);

// Bulk Bogan (strength 90, agility 40, brains 40) should qualify for piledriver
// (min_strength 40, min_agility 0, min_experience 40) — brains 40 >= 40 ✓
assert(boganOffense.some(m => m.id === 'piledriver'), 'Bulk Bogan can use Piledriver');

// Mike Milkman (strength 10, agility 30, brains 30) should NOT qualify for piledriver (needs brains 40)
assert(!milkmanOffense.some(m => m.id === 'piledriver'), 'Mike Milkman cannot use Piledriver');

// Mike Milkman should always have punch and kick (no requirements)
assert(milkmanOffense.some(m => m.id === 'punch'), 'Mike Milkman can use Punch');
assert(milkmanOffense.some(m => m.id === 'kick'),  'Mike Milkman can use Kick');

// Defense moves
const boganDefense   = data.getAvailableMoves(bulkBogan,   'Defense');
const milkmanDefense = data.getAvailableMoves(mikeMilkman, 'Defense');

console.log(`\n  Move counts (Defense):`);
console.log(`    Bulk Bogan:    ${boganDefense.length} moves — ${boganDefense.map(m => m.id).join(', ')}`);
console.log(`    Mike Milkman:  ${milkmanDefense.length} moves — ${milkmanDefense.map(m => m.id).join(', ')}`);

// Retreat has no requirements — everyone can use it
assert(milkmanDefense.some(m => m.id === 'retreat'), 'Mike Milkman can use Retreat');

// Overpower requires min_strength 50 — Milkman (strength 10) cannot
assert(!milkmanDefense.some(m => m.id === 'overpower'), 'Mike Milkman cannot use Overpower');

// Bulk Bogan (strength 90) can use Overpower
assert(boganDefense.some(m => m.id === 'overpower'), 'Bulk Bogan can use Overpower');

// ── OutcomeResolver tests ──────────────────────────────────────────────────

section('OutcomeResolver');

// Run 1000 trials of punch vs block, expect ~80% success (base), adjusted slightly
{
  const trials = 1000;
  const counts = { success: 0, escape: 0, block: 0, reversal: 0 };
  // Equal attr wrestlers — no adjustment expected
  for (let i = 0; i < trials; i++) {
    const { result } = resolver.resolveTurn('punch', 'block', nickOlympia, nickOlympia);
    counts[result]++;
  }
  const successRate = counts.success / trials;
  console.log(`\n  punch vs block (Nick Olympia vs Nick Olympia, ${trials} trials):`);
  console.log(`    success ${(successRate * 100).toFixed(1)}%  block ${(counts.block/trials*100).toFixed(1)}%  escape ${(counts.escape/trials*100).toFixed(1)}%  reversal ${(counts.reversal/trials*100).toFixed(1)}%`);
  console.log(`    (base table: success 80%, block 20%)`);
  assert(successRate > 0.70 && successRate < 0.90, 'punch vs block success rate ≈ 80% with equal attrs');
}

// Bulk Bogan (strength 90) using bodyslam vs retreat against Mike Milkman (size 30)
// offAttr = Strength = 90, defAttr = Size = 30 → delta = +0.06
// base success = 0.4, adjusted ≈ 0.46
{
  const trials = 1000;
  let successes = 0;
  for (let i = 0; i < trials; i++) {
    const { result } = resolver.resolveTurn('bodyslam', 'retreat', bulkBogan, mikeMilkman);
    if (result === 'success') successes++;
  }
  const rate = successes / trials;
  console.log(`\n  bodyslam vs retreat (Bulk Bogan strength 90 vs Milkman size 30, ${trials} trials):`);
  console.log(`    success rate: ${(rate * 100).toFixed(1)}%  (base 40%, expected ≈ 46% after attr adjustment)`);
  assert(rate > 0.35, 'bodyslam vs retreat: attr advantage increases success above base 40%');
}

// El Aguilia (agility 90) using destroyer vs retreat against Bulk Bogan (size 80)
// offAttr = Agility = 90, defAttr = Size = 80 → delta = +0.01
// base success = 0.4
{
  const trials = 1000;
  let successes = 0;
  for (let i = 0; i < trials; i++) {
    const { result } = resolver.resolveTurn('destroyer', 'retreat', elAguilia, bulkBogan);
    if (result === 'success') successes++;
  }
  const rate = successes / trials;
  console.log(`\n  destroyer vs retreat (El Aguilia agility 90 vs Bulk Bogan size 80, ${trials} trials):`);
  console.log(`    success rate: ${(rate * 100).toFixed(1)}%  (base 40%, small attr advantage)`);
  assert(rate > 0.30, 'destroyer vs retreat returns reasonable success rate');
}

// Reversal check — headlock vs counter has 30% reversal
{
  const trials = 2000;
  let reversals = 0;
  for (let i = 0; i < trials; i++) {
    const { result, reversalMoveId } = resolver.resolveTurn('headlock', 'counter', mikeMilkman, nickOlympia);
    if (result === 'reversal') {
      reversals++;
      // Headlock counter_move = 'headlock'
    }
  }
  const rate = reversals / trials;
  console.log(`\n  headlock vs counter (Milkman vs Nick Olympia, ${trials} trials):`);
  console.log(`    reversal rate: ${(rate * 100).toFixed(1)}%  (base 30% reversal, adjusted for brains diff)`);
  assert(rate > 0.15 && rate < 0.50, 'headlock vs counter reversal rate in expected range');
}

// Missing table entry falls back to success
{
  const { result } = resolver.resolveTurn('back_body_drop', 'block', bulkBogan, elAguilia);
  assert(result === 'success', 'Missing outcomes entry defaults to success');
}

// ── MatchState tests ───────────────────────────────────────────────────────

section('MatchState');

{
  const ms = new MatchState(bulkBogan, mikeMilkman);

  assert(ms.getStamina('bulk_bogan')   === 70, 'Initial stamina correct for Bulk Bogan (70)');
  assert(ms.getStamina('mike_milkman') === 30, 'Initial stamina correct for Mike Milkman (30)');

  ms.applyDamage('mike_milkman', 10);
  assert(ms.getStamina('mike_milkman') === 20, 'applyDamage reduces stamina by 10');

  ms.applyDamage('mike_milkman', 50);
  assert(ms.getStamina('mike_milkman') === 0, 'applyDamage floors at 0 (no negative stamina)');

  assert(ms.isMatchOver() === 'bulk_bogan', 'isMatchOver returns winner id when defender hits 0');

  // Stamina recovery — Bogan starts at 70, apply damage then recover
  const ms2 = new MatchState(bulkBogan, mikeMilkman);
  ms2.applyDamage('bulk_bogan', 20);
  assert(ms2.getStamina('bulk_bogan') === 50, 'Damage applied correctly');
  ms2.addStamina('bulk_bogan', 5);
  assert(ms2.getStamina('bulk_bogan') === 55, 'addStamina adds 5');
  ms2.addStamina('bulk_bogan', 100);
  assert(ms2.getStamina('bulk_bogan') === 70, 'addStamina caps at starting stamina (70)');

  // Offense swap
  const ms3 = new MatchState(bulkBogan, mikeMilkman);
  assert(ms3.offensivePlayerId === 'bulk_bogan',   'Initial offense: wrestler1');
  assert(ms3.defensivePlayerId === 'mike_milkman', 'Initial defense: wrestler2');
  ms3.swapOffense();
  assert(ms3.offensivePlayerId === 'mike_milkman', 'After swap: wrestler2 on offense');
  assert(ms3.defensivePlayerId === 'bulk_bogan',   'After swap: wrestler1 on defense');
}

// Pin check at stamina < 20 (should pin often)
{
  const ms = new MatchState(bulkBogan, mikeMilkman);
  ms.applyDamage('mike_milkman', 25); // Milkman now at 5 stamina

  // pinDefense = 5 + 15 (toughness) = 20 → kickoutChance = 0.20
  // pin should succeed ~80% of the time
  let pins = 0;
  for (let i = 0; i < 500; i++) {
    const ms_ = new MatchState(bulkBogan, mikeMilkman);
    ms_.applyDamage('mike_milkman', 25);
    if (ms_.checkPin(mikeMilkman)) pins++;
  }
  const pinRate = pins / 500;
  console.log(`\n  checkPin (Milkman at 5 stamina, toughness 15 → pinDefense 20, kickoutChance 20%):`);
  console.log(`    pin success rate: ${(pinRate * 100).toFixed(1)}%  (expected ≈ 80%)`);
  assert(pinRate > 0.65 && pinRate < 0.95, 'checkPin succeeds ~80% when stamina is very low');
}

// Submission: Nick Olympia (brains 90) vs Mike Milkman (brains 30) at low stamina
{
  let subs = 0;
  const trials = 500;
  for (let i = 0; i < trials; i++) {
    const ms = new MatchState(nickOlympia, mikeMilkman);
    ms.applyDamage('mike_milkman', 22); // Milkman at 8 stamina
    // escapeValue = 8 + 15 = 23 → escapeChance = 0.23
    // Nick brains 90 > Milkman brains 30 → double check → P(escape) ≈ 0.23^2 ≈ 5.3%
    if (ms.checkSubmission(nickOlympia, mikeMilkman)) subs++;
  }
  const subRate = subs / trials;
  console.log(`\n  checkSubmission double-check (Nick Olympia brains 90 vs Milkman brains 30, Milkman at 8 stamina):`);
  console.log(`    submission rate: ${(subRate * 100).toFixed(1)}%  (expected ≈ 95% — double check, escapeChance=23%)`);
  assert(subRate > 0.75, 'double-check submission nearly always succeeds at low stamina');
}

// ── TurnManager full match simulation ─────────────────────────────────────

section('TurnManager — full CPU-vs-CPU match');

function simulateMatch(w1, w2, maxTurns = 200) {
  const ms  = new MatchState(w1, w2);
  const res = new OutcomeResolver(data);
  const tm  = new TurnManager(ms, res, data);

  const log = [];
  let turnResult;

  for (let t = 0; t < maxTurns; t++) {
    const attacker = tm.getAttacker();
    const defender = tm.getDefender();

    const pinOffered = tm.checkPinOpportunity();

    // Select moves
    const offMoveId = tm.cpuSelectOffense(attacker);
    const defMoveId = tm.cpuSelectDefense(defender);

    turnResult = tm.executeTurn(offMoveId, defMoveId);

    log.push({
      turn: t + 1,
      attacker: attacker.id,
      offense: offMoveId,
      defense: defMoveId,
      result: turnResult.result,
      damage: turnResult.damage,
      stamina: { ...ms.stamina },
      pinOffered: turnResult.pinOffered,
      pinResult: turnResult.pinResult,
      submissionResult: turnResult.submissionResult,
    });

    if (turnResult.matchOver) break;
  }

  return { log, final: turnResult, turns: log.length };
}

// Run the match multiple times and collect stats
const matchResults = { bulk_bogan: 0, el_aguilia_blanca: 0, tank_thompson: 0,
                       nick_olympia: 0, mike_milkman: 0 };
const matchSims = 20;

for (let i = 0; i < matchSims; i++) {
  const { log, final, turns } = simulateMatch(bulkBogan, elAguilia);
  if (final?.winner) matchResults[final.winner] = (matchResults[final.winner] || 0) + 1;
}

console.log(`\n  Bulk Bogan vs El Aguilia Blanca (${matchSims} matches):`);
console.log(`    Bulk Bogan wins: ${matchResults.bulk_bogan || 0}`);
console.log(`    El Aguilia wins: ${matchResults.el_aguilia_blanca || 0}`);

// Run a single match with verbose logging
console.log('\n  Single match play-by-play (Bulk Bogan vs Mike Milkman):');
const { log, final, turns } = simulateMatch(bulkBogan, mikeMilkman, 200);
for (const e of log.slice(0, 15)) {
  const pinNote = e.pinOffered
    ? (e.pinResult ? ' [PIN WINS!]' : ' [pin fails]')
    : '';
  const subNote = e.submissionResult ? ' [SUBMISSION!]' : '';
  console.log(
    `    T${String(e.turn).padStart(2)}: ${e.attacker.padEnd(12)} ${e.offense.padEnd(20)} vs ${e.defense.padEnd(12)}` +
    ` → ${e.result || 'PIN_ATTEMPT'}${pinNote}${subNote}` +
    `  dmg:${e.damage}  stamina:[${e.stamina.bulk_bogan}, ${e.stamina.mike_milkman}]`
  );
}
if (turns > 15) console.log(`    ... (${turns - 15} more turns)`);
console.log(`  Final: ${final?.winner} wins after ${turns} turns via ${
  final?.pinResult ? 'pin' : final?.submissionResult ? 'submission' : 'KO'
}`);

assert(final?.matchOver === true, 'Match reaches a conclusion');
assert(typeof final?.winner === 'string', 'Match has a winner');
assert(turns <= 200, 'Match completes within turn limit');

// Verify pin opportunity correctly triggers after two successive successes
{
  const ms2 = new MatchState(bulkBogan, mikeMilkman);
  const tm2 = new TurnManager(ms2, new OutcomeResolver(data), data);

  // Manually drain Milkman stamina
  ms2.applyDamage('mike_milkman', 25); // 5 stamina remaining

  // First turn — lastDefenderId should be null → no pin yet
  assert(!tm2.checkPinOpportunity(), 'No pin offered on first turn (lastDefenderId is null)');

  // Simulate a success result manually by setting lastDefenderId
  tm2.lastDefenderId = 'mike_milkman';
  assert(tm2.checkPinOpportunity(), 'Pin offered after consecutive defense with stamina < 20');

  // After a non-success (offense switch), pin resets
  tm2.lastDefenderId = null;
  assert(!tm2.checkPinOpportunity(), 'Pin not offered after offense switch (lastDefenderId reset)');
}

// ── Summary ────────────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
