/**
 * Classic Snakes & Ladders — Game Simulation
 *
 * Simulates the traditional 10x10 board game with fixed snakes and ladders
 * (no wormholes). Reports the same statistics as the main Wormhole Warp
 * simulation for easy comparison.
 *
 * Rules:
 *   - 1 die (1-6), players start at tile 1, first to exactly reach 100 wins
 *   - Overshoot tile 100 = bounce back by the excess (matches game behavior)
 *   - Landing on a ladder bottom moves you to the top
 *   - Landing on a snake head moves you to the tail
 *
 * Usage:  node sim/simulate-snl.mjs
 */

// ─── Helpers ────────────────────────────────────────────────────────
const rollDice = () => Math.floor(Math.random() * 6) + 1;

function percentile(sorted, p) {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// ─── Classic Board Layout ───────────────────────────────────────────
// Ladders: bottom -> top
const LADDERS = {
  2: 38,
  7: 14,
  8: 31,
  15: 26,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  78: 98,
  87: 94,
};

// Snakes: head -> tail
const SNAKES = {
  16: 6,
  46: 25,
  49: 11,
  62: 19,
  64: 60,
  74: 53,
  89: 68,
  92: 88,
  95: 75,
  99: 80,
};

// Combined lookup: tile -> destination (if any)
const BOARD_LINKS = { ...LADDERS, ...SNAKES };

// ─── Game Simulation ────────────────────────────────────────────────
const MAX_TURNS = 2000; // safety valve

function simulateGame(numPlayers) {
  const players = Array.from({ length: numPlayers }, (_, i) => ({ id: i, position: 1 }));
  let turn = 0;
  let currentIdx = 0;
  let leadChanges = 0;
  let prevLeader = -1;
  let ladderHits = 0;
  let snakeHits = 0;

  while (turn < MAX_TURNS) {
    turn++;
    const player = players[currentIdx];
    const roll = rollDice();
    const target = player.position + roll;

    // Overshot — bounce back by excess (matches game's bounce-back logic)
    if (target > 100) {
      const overshoot = target - 100;
      player.position = 100 - overshoot;

      // Check for snake/ladder at bounce-back destination
      const link = BOARD_LINKS[player.position];
      if (link !== undefined) {
        if (link > player.position) ladderHits++;
        else snakeHits++;
        player.position = link;
      }

      // Track lead changes
      const leader = players.reduce((best, p) => p.position > best.position ? p : best, players[0]).id;
      if (leader !== prevLeader && prevLeader !== -1) leadChanges++;
      prevLeader = leader;

      currentIdx = (currentIdx + 1) % numPlayers;
      continue;
    }

    player.position = target;

    // Exact win
    if (player.position === 100) {
      return { winner: player.id, turns: turn, leadChanges, ladderHits, snakeHits };
    }

    // Check for snake or ladder
    const link = BOARD_LINKS[player.position];
    if (link !== undefined) {
      if (link > player.position) ladderHits++;
      else snakeHits++;
      player.position = link;
    }

    // Track lead changes
    const leader = players.reduce((best, p) => p.position > best.position ? p : best, players[0]).id;
    if (leader !== prevLeader && prevLeader !== -1) leadChanges++;
    prevLeader = leader;

    currentIdx = (currentIdx + 1) % numPlayers;
  }

  // Stalemate — shouldn't happen in practice
  const leader = players.reduce((best, p) => p.position > best.position ? p : best, players[0]);
  return { winner: leader.id, turns: MAX_TURNS, leadChanges, ladderHits, snakeHits };
}

// ─── Statistics ─────────────────────────────────────────────────────
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

  // Snake/Ladder event counts
  const totalLadders = results.reduce((s, r) => s + r.ladderHits, 0);
  const totalSnakes = results.reduce((s, r) => s + r.snakeHits, 0);
  const totalEvents = totalLadders + totalSnakes;

  // First-mover advantage
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
  console.log(`    First-mover (P1) win%:      ${p0WinPct}%  (ideal = ${(100 / numPlayers).toFixed(1)}%)`);
  console.log();
  console.log(`  LEAD CHANGES`);
  console.log(`    Average per game: ${avgLeadChanges.toFixed(1)}`);
  console.log();
  console.log(`  SNAKE & LADDER EVENTS`);
  console.log(`    Total (all games):  ${totalEvents.toLocaleString()}`);
  console.log(`    Per game average:   ${(totalEvents / results.length).toFixed(1)}`);
  console.log(`      Ladders hit:     ${totalLadders.toLocaleString().padStart(8)}  (${((totalLadders / Math.max(totalEvents, 1)) * 100).toFixed(1)}%)`);
  console.log(`      Snakes hit:      ${totalSnakes.toLocaleString().padStart(8)}  (${((totalSnakes / Math.max(totalEvents, 1)) * 100).toFixed(1)}%)`);
  console.log(`      Avg ladders/game: ${(totalLadders / results.length).toFixed(1)}`);
  console.log(`      Avg snakes/game:  ${(totalSnakes / results.length).toFixed(1)}`);

  if (max === MAX_TURNS) {
    const stalemates = turns.filter(t => t === MAX_TURNS).length;
    console.log(`\n  WARNING: ${stalemates} game(s) hit the ${MAX_TURNS}-turn safety limit!`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────
const NUM_GAMES = 10_000;
const PLAYER_COUNTS = [2, 3, 4];

console.log(`\n${'#'.repeat(60)}`);
console.log(`  CLASSIC SNAKES & LADDERS SIMULATION`);
console.log(`${'#'.repeat(60)}`);
console.log(`  ${NUM_GAMES.toLocaleString()} games per player count`);
console.log(`  Board: Standard 10x10 with fixed snakes & ladders`);
console.log(`  Ladders (${Object.keys(LADDERS).length}): ${Object.entries(LADDERS).map(([f, t]) => `${f}->${t}`).join(', ')}`);
console.log(`  Snakes  (${Object.keys(SNAKES).length}): ${Object.entries(SNAKES).map(([f, t]) => `${f}->${t}`).join(', ')}`);
console.log(`  Rules: 1d6, start at 1, exact 100 to win, overshoot = bounce back`);

for (const numPlayers of PLAYER_COUNTS) {
  console.log(`\nRunning ${NUM_GAMES.toLocaleString()} games with ${numPlayers} players...`);
  const results = [];
  for (let i = 0; i < NUM_GAMES; i++) {
    results.push(simulateGame(numPlayers));
  }
  analyzeResults(results, numPlayers, `CLASSIC SNAKES & LADDERS — ${numPlayers} PLAYERS`);
}

// ─── Cross-player-count comparison ──────────────────────────────────
console.log(`\n${'='.repeat(60)}`);
console.log('  CROSS-PLAYER-COUNT SUMMARY');
console.log(`${'='.repeat(60)}`);
console.log(`  ${'Players'.padEnd(10)} ${'Avg Turns'.padEnd(12)} ${'Median'.padEnd(10)} ${'Avg Lead Chg'.padEnd(14)} ${'P1 Win%'.padEnd(10)}`);

for (const numPlayers of PLAYER_COUNTS) {
  const results = [];
  for (let i = 0; i < NUM_GAMES; i++) {
    results.push(simulateGame(numPlayers));
  }
  const turns = results.map(r => r.turns);
  const avg = (turns.reduce((a, b) => a + b, 0) / turns.length).toFixed(1);
  const sorted = [...turns].sort((a, b) => a - b);
  const median = percentile(sorted, 50).toFixed(1);
  const avgLC = (results.map(r => r.leadChanges).reduce((a, b) => a + b, 0) / results.length).toFixed(1);
  const wins = new Array(numPlayers).fill(0);
  results.forEach(r => wins[r.winner]++);
  const p1Win = ((wins[0] / results.length) * 100).toFixed(1);

  console.log(`  ${String(numPlayers).padEnd(10)} ${avg.padEnd(12)} ${median.padEnd(10)} ${avgLC.padEnd(14)} ${p1Win}%`);
}

console.log();
