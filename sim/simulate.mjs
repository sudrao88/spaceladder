/**
 * Wormhole Warp — Game Simulation
 *
 * Runs thousands of games with both the OLD (static) and NEW (dynamic rubber-band)
 * wormhole logic, then prints comparative statistics:
 *   - Average / median / min / max turns per game
 *   - Win distribution across players (fairness)
 *   - Lead change frequency
 *   - Wormhole event breakdowns
 *
 * Usage:  node sim/simulate.mjs [games] [players]
 *   e.g.  node sim/simulate.mjs 10000 4
 */

// ─── Helpers ────────────────────────────────────────────────────────
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rollDice = () => Math.floor(Math.random() * 6) + 1;

// ─── OLD (static) wormhole logic ────────────────────────────────────
const OLD = {
  CHANCE: 0.25,
  DRASTIC_CHANCE: 0.15,
  FORWARD_BIAS: 0.57,
  SAFE_MIN: 1,
  SAFE_MAX: 98,
  DEST_MIN: 2,
  DEST_MAX: 97,
  FWD_NORMAL: [5, 15],
  FWD_DRASTIC: [20, 40],
  BWD_NORMAL: [3, 10],
  BWD_DRASTIC: [15, 30],
};

function oldCheckWormhole(player, _allPlayers, _history) {
  const tile = player.position;
  if (tile <= OLD.SAFE_MIN || tile >= OLD.SAFE_MAX) return null;
  if (Math.random() >= OLD.CHANCE) return null;

  const isDrastic = Math.random() < OLD.DRASTIC_CHANCE;
  const isForward = Math.random() < OLD.FORWARD_BIAS;

  let jump;
  if (isForward) {
    const [lo, hi] = isDrastic ? OLD.FWD_DRASTIC : OLD.FWD_NORMAL;
    jump = randomInt(lo, hi);
  } else {
    const [lo, hi] = isDrastic ? OLD.BWD_DRASTIC : OLD.BWD_NORMAL;
    jump = randomInt(lo, hi);
  }

  let dest = isForward ? tile + jump : tile - jump;
  dest = clamp(dest, OLD.DEST_MIN, OLD.DEST_MAX);
  if (dest === tile) return null;

  const type = dest > tile ? 'boost' : 'glitch';
  return { dest, type };
}

// ─── NEW (dynamic rubber-band) wormhole logic ───────────────────────
const DEST_MIN = 2;
const DEST_MAX = 98;
const SAFE_MIN = 1;
const SAFE_MAX = 99;

function computeParams(player, allPlayers, history) {
  const positions = allPlayers.map(p => p.position);
  const avg = positions.reduce((a, b) => a + b, 0) / positions.length;
  const maxPos = Math.max(...positions);
  const minPos = Math.min(...positions);
  const leadGap = (player.position - avg) / 99;
  const packSpread = (maxPos - minPos) / 99;

  const playerHist = history.filter(h => h.playerId === player.id).slice(-4);
  const momentum = playerHist.length > 0
    ? playerHist.reduce((s, h) => s + Math.sign(h.delta), 0) / playerHist.length
    : 0;

  const isLeader = player.position === maxPos && packSpread > 0.08;
  const isTrailing = player.position === minPos && packSpread > 0.10;
  const isLate = player.position > 65;
  const isEnd = player.position > 85;

  let triggerChance = 0.28;
  if (isLeader) triggerChance += packSpread * 0.20;
  if (isLate) triggerChance += 0.08;
  if (isEnd) triggerChance += 0.07;
  triggerChance = clamp(triggerChance, 0.15, 0.55);

  let forwardBias = 0.50;
  forwardBias -= leadGap * 0.35;
  forwardBias -= momentum * 0.18;
  if (isTrailing) forwardBias += packSpread * 0.20;
  forwardBias = clamp(forwardBias, 0.20, 0.82);

  let fwdMin = 4, fwdMax = 14, bwdMin = 3, bwdMax = 10;
  if (isTrailing && packSpread > 0.15) {
    const bonus = Math.floor(packSpread * 18);
    fwdMin += Math.floor(bonus * 0.5);
    fwdMax += bonus;
  }
  if (isLeader && packSpread > 0.15) {
    const penalty = Math.floor(packSpread * 14);
    bwdMin += Math.floor(penalty * 0.5);
    bwdMax += penalty;
  }
  if (isLate) { fwdMax += 4; bwdMax += 4; }

  let drasticChance = 0.10;
  if (isLeader) drasticChance += 0.08;
  if (isTrailing) drasticChance += 0.08;
  if (isEnd) drasticChance += 0.05;

  let slingshotChance = 0, gravityWellChance = 0;
  if (isTrailing && packSpread > 0.18) {
    slingshotChance = clamp(packSpread * 0.25, 0, 0.14);
    if (momentum < -0.3) slingshotChance += 0.06;
  }
  if (isLeader && packSpread > 0.18) {
    gravityWellChance = clamp(packSpread * 0.22, 0, 0.12);
    if (momentum > 0.3) gravityWellChance += 0.06;
  }

  return {
    triggerChance, forwardBias,
    forwardRange: [fwdMin, fwdMax], backwardRange: [bwdMin, bwdMax],
    drasticChance,
    drasticForwardRange: [fwdMax + 2, fwdMax + 22],
    drasticBackwardRange: [bwdMax + 2, bwdMax + 18],
    slingshotChance, gravityWellChance,
  };
}

function newCheckWormhole(player, allPlayers, history) {
  const tile = player.position;
  if (tile <= SAFE_MIN || tile >= SAFE_MAX) return null;

  const p = computeParams(player, allPlayers, history);
  if (Math.random() >= p.triggerChance) return null;

  let dest, type;
  const specialRoll = Math.random();

  if (specialRoll < p.slingshotChance) {
    const maxPos = Math.max(...allPlayers.map(x => x.position));
    dest = clamp(maxPos - randomInt(3, 8), DEST_MIN, DEST_MAX);
    type = 'slingshot';
  } else if (specialRoll < p.slingshotChance + p.gravityWellChance) {
    const others = allPlayers.filter(x => x.id !== player.id).map(x => x.position).sort((a, b) => a - b);
    const median = others.length > 0 ? others[Math.floor(others.length / 2)] : tile;
    dest = clamp(Math.round((tile + median) / 2) + randomInt(-3, 3), DEST_MIN, DEST_MAX);
    type = 'gravity-well';
  } else {
    const isDrastic = Math.random() < p.drasticChance;
    const isForward = Math.random() < p.forwardBias;
    let jump;
    if (isForward) {
      const [lo, hi] = isDrastic ? p.drasticForwardRange : p.forwardRange;
      jump = randomInt(lo, hi);
    } else {
      const [lo, hi] = isDrastic ? p.drasticBackwardRange : p.backwardRange;
      jump = randomInt(lo, hi);
    }
    dest = isForward ? tile + jump : tile - jump;
    type = isForward ? 'boost' : 'glitch';
  }

  dest = clamp(dest, DEST_MIN, DEST_MAX);
  if (dest === tile) return null;

  if (type === 'boost' && dest < tile) type = 'glitch';
  if (type === 'glitch' && dest > tile) type = 'boost';
  return { dest, type };
}

// ─── Game simulation ────────────────────────────────────────────────
const MAX_TURNS = 2000; // safety valve

function simulateGame(numPlayers, wormholeFn) {
  const players = Array.from({ length: numPlayers }, (_, i) => ({ id: i, position: 1 }));
  const history = [];
  let turn = 0;
  let currentIdx = 0;
  let leadChanges = 0;
  let prevLeader = -1;
  const wormholeCounts = { boost: 0, glitch: 0, slingshot: 0, 'gravity-well': 0 };
  let totalWormholes = 0;

  while (turn < MAX_TURNS) {
    turn++;
    const player = players[currentIdx];
    const roll = rollDice();
    const target = player.position + roll;

    // Overshot — turn wasted (matches game: position doesn't change)
    if (target > 100) {
      currentIdx = (currentIdx + 1) % numPlayers;
      continue;
    }

    player.position = target;

    // Win check (before wormhole, matching game logic — wormhole only fires post-move
    // and nextTurn checks win; but in the actual game movePlayer sets position then
    // handleMovementComplete fires checkWormhole, then nextTurn checks win.
    // So: position is set, wormhole fires, then we check win.)

    // Wormhole check
    const wh = wormholeFn(player, players, history);
    if (wh) {
      const delta = wh.dest - player.position;
      history.push({ playerId: player.id, fromTile: player.position, toTile: wh.dest, delta });
      player.position = wh.dest;
      wormholeCounts[wh.type] = (wormholeCounts[wh.type] || 0) + 1;
      totalWormholes++;
    }

    // Win check (after wormhole teleport, matching game's nextTurn logic)
    if (player.position >= 100) {
      player.position = 100;
      return { winner: player.id, turns: turn, leadChanges, wormholeCounts, totalWormholes };
    }

    // Track lead changes
    const leader = players.reduce((best, p) => p.position > best.position ? p : best, players[0]).id;
    if (leader !== prevLeader && prevLeader !== -1) leadChanges++;
    prevLeader = leader;

    currentIdx = (currentIdx + 1) % numPlayers;
  }

  // Stalemate — shouldn't happen in practice
  const leader = players.reduce((best, p) => p.position > best.position ? p : best, players[0]);
  return { winner: leader.id, turns: MAX_TURNS, leadChanges, wormholeCounts, totalWormholes };
}

// ─── Statistics ─────────────────────────────────────────────────────
function percentile(sorted, p) {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function analyzeResults(results, numPlayers, label) {
  const turns = results.map(r => r.turns).sort((a, b) => a - b);
  const avg = turns.reduce((a, b) => a + b, 0) / turns.length;
  const median = percentile(turns, 50);
  const p10 = percentile(turns, 10);
  const p90 = percentile(turns, 90);
  const min = turns[0];
  const max = turns[turns.length - 1];

  // Win distribution
  const wins = new Array(numPlayers).fill(0);
  results.forEach(r => wins[r.winner]++);
  const winPcts = wins.map(w => ((w / results.length) * 100).toFixed(1));

  // Win rate fairness: standard deviation of win percentages
  const avgWinPct = 100 / numPlayers;
  const winStdDev = Math.sqrt(
    winPcts.reduce((sum, pct) => sum + (parseFloat(pct) - avgWinPct) ** 2, 0) / numPlayers
  );

  // Lead changes
  const leadChanges = results.map(r => r.leadChanges);
  const avgLeadChanges = leadChanges.reduce((a, b) => a + b, 0) / leadChanges.length;

  // Wormhole counts
  const totWH = results.reduce((s, r) => s + r.totalWormholes, 0);
  const whByType = {};
  for (const r of results) {
    for (const [type, count] of Object.entries(r.wormholeCounts)) {
      whByType[type] = (whByType[type] || 0) + count;
    }
  }

  // First-mover advantage: how often player 0 wins
  const p0WinPct = ((wins[0] / results.length) * 100).toFixed(1);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${label}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  Games simulated:    ${results.length.toLocaleString()}`);
  console.log(`  Players per game:   ${numPlayers}`);
  console.log();
  console.log(`  TURNS PER GAME`);
  console.log(`    Average:          ${avg.toFixed(1)}`);
  console.log(`    Median:           ${median.toFixed(1)}`);
  console.log(`    10th percentile:  ${p10.toFixed(1)}`);
  console.log(`    90th percentile:  ${p90.toFixed(1)}`);
  console.log(`    Min:              ${min}`);
  console.log(`    Max:              ${max}`);
  console.log();
  console.log(`  WIN DISTRIBUTION`);
  for (let i = 0; i < numPlayers; i++) {
    const bar = '#'.repeat(Math.round(parseFloat(winPcts[i]) / 2));
    console.log(`    Player ${i + 1}:  ${winPcts[i]}%  ${bar}`);
  }
  console.log(`    Fairness (StdDev of win%):  ${winStdDev.toFixed(2)}  (lower = fairer, ideal = 0)`);
  console.log(`    First-mover (P1) win%:      ${p0WinPct}%  (ideal = ${(100/numPlayers).toFixed(1)}%)`);
  console.log();
  console.log(`  LEAD CHANGES`);
  console.log(`    Average per game: ${avgLeadChanges.toFixed(1)}`);
  console.log();
  console.log(`  WORMHOLE EVENTS`);
  console.log(`    Total (all games):  ${totWH.toLocaleString()}`);
  console.log(`    Per game average:   ${(totWH / results.length).toFixed(1)}`);
  for (const [type, count] of Object.entries(whByType).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / Math.max(totWH, 1)) * 100).toFixed(1);
    console.log(`      ${type.padEnd(14)} ${count.toLocaleString().padStart(8)}  (${pct}%)`);
  }
  if (max === MAX_TURNS) {
    const stalemates = turns.filter(t => t === MAX_TURNS).length;
    console.log(`\n  WARNING: ${stalemates} game(s) hit the ${MAX_TURNS}-turn safety limit!`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────
const NUM_GAMES = parseInt(process.argv[2]) || 5000;
const NUM_PLAYERS = parseInt(process.argv[3]) || 4;

console.log(`\nSimulating ${NUM_GAMES.toLocaleString()} games with ${NUM_PLAYERS} players each...\n`);

// Run OLD logic
console.log('Running OLD (static) logic...');
const oldResults = [];
for (let i = 0; i < NUM_GAMES; i++) {
  oldResults.push(simulateGame(NUM_PLAYERS, oldCheckWormhole));
}
analyzeResults(oldResults, NUM_PLAYERS, 'OLD LOGIC (Static Wormholes)');

// Run NEW logic
console.log('\nRunning NEW (dynamic rubber-band) logic...');
const newResults = [];
for (let i = 0; i < NUM_GAMES; i++) {
  newResults.push(simulateGame(NUM_PLAYERS, newCheckWormhole));
}
analyzeResults(newResults, NUM_PLAYERS, 'NEW LOGIC (Dynamic Rubber-Band Wormholes)');

// Comparison summary
const oldAvg = oldResults.map(r => r.turns).reduce((a, b) => a + b, 0) / oldResults.length;
const newAvg = newResults.map(r => r.turns).reduce((a, b) => a + b, 0) / newResults.length;
const oldLC = oldResults.map(r => r.leadChanges).reduce((a, b) => a + b, 0) / oldResults.length;
const newLC = newResults.map(r => r.leadChanges).reduce((a, b) => a + b, 0) / newResults.length;

const oldWins = new Array(NUM_PLAYERS).fill(0);
const newWins = new Array(NUM_PLAYERS).fill(0);
oldResults.forEach(r => oldWins[r.winner]++);
newResults.forEach(r => newWins[r.winner]++);
const idealWinPct = 100 / NUM_PLAYERS;
const oldStdDev = Math.sqrt(oldWins.reduce((s, w) => s + (((w / NUM_GAMES) * 100) - idealWinPct) ** 2, 0) / NUM_PLAYERS);
const newStdDev = Math.sqrt(newWins.reduce((s, w) => s + (((w / NUM_GAMES) * 100) - idealWinPct) ** 2, 0) / NUM_PLAYERS);

console.log(`\n${'='.repeat(60)}`);
console.log('  COMPARISON SUMMARY');
console.log(`${'='.repeat(60)}`);
console.log(`                        OLD          NEW         CHANGE`);
console.log(`  Avg turns:          ${oldAvg.toFixed(1).padStart(7)}      ${newAvg.toFixed(1).padStart(7)}      ${((newAvg - oldAvg) / oldAvg * 100).toFixed(1)}%`);
console.log(`  Avg lead changes:   ${oldLC.toFixed(1).padStart(7)}      ${newLC.toFixed(1).padStart(7)}      ${((newLC - oldLC) / Math.max(oldLC, 0.01) * 100).toFixed(1)}%`);
console.log(`  Win fairness (SD):  ${oldStdDev.toFixed(2).padStart(7)}      ${newStdDev.toFixed(2).padStart(7)}      ${newStdDev < oldStdDev ? 'IMPROVED' : 'WORSE'}`);
console.log(`  P1 advantage:       ${((oldWins[0]/NUM_GAMES)*100).toFixed(1).padStart(6)}%     ${((newWins[0]/NUM_GAMES)*100).toFixed(1).padStart(6)}%`);
console.log();
