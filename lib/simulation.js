const AGENTS = [
  { id: "claude", name: "Claude", color: "#d97757" },
  { id: "chatgpt", name: "ChatGPT", color: "#74aa9c" },
  { id: "gemini", name: "Gemini", color: "#4285f4" },
  { id: "deepseek", name: "DeepSeek", color: "#6c5ce7" },
  { id: "grok", name: "Grok", color: "#f1c40f" },
];

const TEAMS = [
  "Brazil", "Argentina", "France", "Germany", "Spain",
  "England", "Portugal", "Netherlands", "Japan", "Morocco",
  "USA", "Croatia",
];

const STARTING_BALANCE = 250;
const TICK_MS = 15000;

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeMatch(id, status) {
  let a = pick(TEAMS);
  let b;
  do { b = pick(TEAMS); } while (b === a);
  const favorsA = Math.random() < 0.5;
  const oddsA = favorsA ? 1.5 + Math.random() * 0.7 : 2.4 + Math.random() * 1.6;
  const oddsB = favorsA ? 2.4 + Math.random() * 1.6 : 1.5 + Math.random() * 0.7;
  return {
    id,
    teamA: a,
    teamB: b,
    scoreA: 0,
    scoreB: 0,
    oddsA: Math.round(oddsA * 100) / 100,
    oddsB: Math.round(oddsB * 100) / 100,
    status,
    minute: status === "LIVE" ? Math.floor(Math.random() * 30) : 0,
    bets: [],
  };
}

function initState() {
  const balances = {};
  AGENTS.forEach(a => { balances[a.id] = STARTING_BALANCE; });

  const matches = [];
  for (let i = 0; i < 6; i++) {
    matches.push(makeMatch(i, i < 2 ? "LIVE" : "UPCOMING"));
  }

  return {
    balances,
    matches,
    pendingBets: [],
    feed: [],
    arenaPrice: 0.042,
    arenaChange: 0,
    lastUpdate: Date.now(),
  };
}

function addFeedItem(state, entry) {
  state.feed.unshift({ ...entry, time: Date.now() });
  if (state.feed.length > 30) state.feed.length = 30;
}

function maybePlaceBet(state) {
  if (Math.random() > 0.12) return;

  const agent = pick(AGENTS);
  const liveMatches = state.matches.filter(m => m.status === "LIVE" || m.status === "UPCOMING");
  if (!liveMatches.length || state.balances[agent.id] < 5) return;

  const match = pick(liveMatches);
  const pickA = Math.random() < 0.5;
  const sidePick = pickA ? match.teamA : match.teamB;
  const odds = pickA ? match.oddsA : match.oddsB;

  const maxBet = Math.min(state.balances[agent.id], 40);
  if (maxBet < 5) return;
  const amount = Math.max(5, Math.floor(5 + Math.random() * (maxBet - 5)));

  state.balances[agent.id] -= amount;

  const bet = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    agent: agent.id,
    pick: sidePick,
    amount,
    odds,
    matchId: match.id,
    resolveAtMinute: match.status === "LIVE" ? Math.min(90, match.minute + 5 + Math.floor(Math.random() * 10)) : 90,
    settled: false,
  };
  match.bets.push(bet);
  if (match.bets.length > 4) match.bets.shift();
  state.pendingBets.push(bet);

  addFeedItem(state, {
    kind: "placed",
    agentId: agent.id,
    pick: sidePick,
    amount,
    odds,
    teamA: match.teamA,
    teamB: match.teamB,
  });
}

function settleBets(state) {
  state.pendingBets = state.pendingBets.filter(bet => {
    if (bet.settled) return false;
    const match = state.matches[bet.matchId];
    const matchOver = match.status === "FULL TIME";
    const reached = match.minute >= bet.resolveAtMinute;
    if (!matchOver && !reached) return true;

    const isDraw = match.scoreA === match.scoreB;
    const leadingA = match.scoreA > match.scoreB;

    if (isDraw) {
      state.balances[bet.agent] += bet.amount;
      addFeedItem(state, { kind: "push", agentId: bet.agent, pick: bet.pick, amount: bet.amount });
    } else {
      const won = (bet.pick === match.teamA && leadingA) || (bet.pick === match.teamB && !leadingA);
      if (won) {
        const payout = bet.amount * bet.odds;
        state.balances[bet.agent] += payout;
        addFeedItem(state, { kind: "win", agentId: bet.agent, pick: bet.pick, amount: bet.amount, payout });
      } else {
        addFeedItem(state, { kind: "lose", agentId: bet.agent, pick: bet.pick, amount: bet.amount });
      }
    }
    bet.settled = true;
    return false;
  });
}

function updateArenaPrice(state) {
  const change = (Math.random() - 0.5) * 0.02;
  state.arenaPrice = Math.max(0.001, state.arenaPrice * (1 + change));
  state.arenaChange = change * 100;
}

function tickMatches(state) {
  state.matches.forEach((match, idx) => {
    if (match.status === "LIVE") {
      match.minute += 1;
      if (Math.random() < 0.05) {
        if (Math.random() < 0.5) match.scoreA += 1; else match.scoreB += 1;
      }
      if (match.minute >= 90) match.status = "FULL TIME";
    } else if (match.status === "UPCOMING" && Math.random() < 0.05) {
      match.status = "LIVE";
      match.minute = 0;
    } else if (match.status === "FULL TIME" && Math.random() < 0.02) {
      state.matches[idx] = makeMatch(idx, "UPCOMING");
    }
  });
}

function tick(state) {
  tickMatches(state);
  maybePlaceBet(state);
  settleBets(state);
  updateArenaPrice(state);
}

module.exports = { AGENTS, STARTING_BALANCE, TICK_MS, initState, tick };
