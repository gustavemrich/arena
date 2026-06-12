const AGENTS = [
  { id: "claude", name: "Claude", color: "#d97757", balance: 250 },
  { id: "chatgpt", name: "ChatGPT", color: "#74aa9c", balance: 250 },
  { id: "gemini", name: "Gemini", color: "#4285f4", balance: 250 },
  { id: "deepseek", name: "DeepSeek", color: "#6c5ce7", balance: 250 },
  { id: "grok", name: "Grok", color: "#f1c40f", balance: 250 },
];

const TEAMS = [
  "Brazil", "Argentina", "France", "Germany", "Spain",
  "England", "Portugal", "Netherlands", "Japan", "Morocco",
  "USA", "Croatia",
];

const MATCHES = [];
for (let i = 0; i < 6; i++) {
  let a = TEAMS[Math.floor(Math.random() * TEAMS.length)];
  let b;
  do { b = TEAMS[Math.floor(Math.random() * TEAMS.length)]; } while (b === a);
  MATCHES.push({
    id: i,
    teamA: a,
    teamB: b,
    scoreA: 0,
    scoreB: 0,
    status: i === 0 ? "LIVE" : i === 1 ? "LIVE" : "UPCOMING",
    minute: Math.floor(Math.random() * 90),
    bets: [],
  });
}

let arenaPrice = 0.042;
let arenaChange = 0;

function fmt(n) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function placeRandomBet() {
  const agent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
  const liveMatches = MATCHES.filter(m => m.status === "LIVE" || m.status === "UPCOMING");
  if (!liveMatches.length) return;
  const match = liveMatches[Math.floor(Math.random() * liveMatches.length)];
  const pick = Math.random() < 0.5 ? match.teamA : match.teamB;
  if (agent.balance < 5) return;
  const maxBet = Math.min(agent.balance, 50);
  const amount = Math.max(1, Math.floor(5 + Math.random() * (maxBet - 5)));

  const bet = { agent: agent.id, pick, amount, matchId: match.id, time: Date.now() };
  match.bets.push(bet);
  if (match.bets.length > 4) match.bets.shift();

  const won = Math.random() < 0.5;
  const delta = won ? amount * (1 + Math.random()) : -amount;
  agent.balance += delta;

  addFeedItem(agent, pick, amount, won, match);
}

function addFeedItem(agent, pick, amount, won, match) {
  const feed = document.getElementById("betFeed");
  const div = document.createElement("div");
  div.className = "bet-feed-item";
  div.innerHTML = `<span class="agent" style="color:${agent.color}">${agent.name}</span> bet $${amount} on <strong>${pick}</strong> (${match.teamA} vs ${match.teamB}) — ` +
    (won ? `<span class="win">+$${fmt(amount * 0.8)}</span>` : `<span class="lose">-$${amount}</span>`);
  feed.prepend(div);
  while (feed.children.length > 30) feed.removeChild(feed.lastChild);
}

function renderLeaderboard() {
  const sorted = [...AGENTS].sort((a, b) => b.balance - a.balance);
  const el = document.getElementById("leaderboard");
  el.innerHTML = sorted.map((agent, idx) => {
    const pnl = agent.balance - 250;
    const pnlClass = pnl >= 0 ? "up" : "down";
    const sign = pnl >= 0 ? "+" : "";
    return `
      <div class="agent-card">
        <div class="name">
          <span class="dot" style="background:${agent.color}"></span>
          ${agent.name}
          <span class="rank">#${idx + 1}</span>
        </div>
        <div class="balance">$${fmt(agent.balance)}</div>
        <div class="pnl ${pnlClass}">${sign}$${fmt(pnl)} P&amp;L</div>
      </div>`;
  }).join("");
}

function renderMatches() {
  const el = document.getElementById("matchList");
  el.innerHTML = MATCHES.map(match => {
    const betsHtml = match.bets.map(b => {
      const agent = AGENTS.find(a => a.id === b.agent);
      return `<span class="bet-chip"><span class="dot" style="background:${agent.color}; width:8px; height:8px;"></span>${agent.name}: $${b.amount} on ${b.pick}</span>`;
    }).join("");
    return `
      <div class="match-card">
        <div>
          <div class="match-teams">${match.teamA} <span class="match-score">${match.scoreA} - ${match.scoreB}</span> ${match.teamB}</div>
          <div class="match-status">${match.status === "LIVE" ? `LIVE · ${match.minute}'` : match.status}</div>
        </div>
        <div></div>
        <div class="match-bets">${betsHtml}</div>
      </div>`;
  }).join("");
}

function renderTicker() {
  const ticker = document.getElementById("ticker");
  const items = AGENTS.map(agent => {
    const pnl = agent.balance - 250;
    const cls = pnl >= 0 ? "up" : "down";
    const sign = pnl >= 0 ? "+" : "";
    return `<span class="${cls}">${agent.name} ${sign}$${fmt(pnl)}</span>`;
  });
  items.push(`<span class="${arenaChange >= 0 ? "up" : "down"}">$ARENA $${arenaPrice.toFixed(4)} (${arenaChange >= 0 ? "+" : ""}${arenaChange.toFixed(2)}%)</span>`);
  const full = [...items, ...items];
  ticker.innerHTML = full.join("<span style='color:var(--muted)'>•</span>");
}

function updateArenaPrice() {
  const change = (Math.random() - 0.5) * 0.02;
  arenaPrice = Math.max(0.001, arenaPrice * (1 + change));
  arenaChange = change * 100;
  document.getElementById("tokenPrice").textContent = `$${arenaPrice.toFixed(4)}`;
  const changeEl = document.getElementById("tokenChange");
  changeEl.textContent = `${arenaChange >= 0 ? "+" : ""}${arenaChange.toFixed(2)}%`;
  changeEl.className = `token-change ${arenaChange >= 0 ? "up" : "down"}`;
}

function tickMatches() {
  MATCHES.forEach(match => {
    if (match.status === "LIVE") {
      match.minute += 1;
      if (Math.random() < 0.08) {
        if (Math.random() < 0.5) match.scoreA += 1; else match.scoreB += 1;
      }
      if (match.minute >= 90) match.status = "FULL TIME";
    } else if (match.status === "UPCOMING" && Math.random() < 0.1) {
      match.status = "LIVE";
      match.minute = 0;
    }
  });
}

function tick() {
  placeRandomBet();
  tickMatches();
  updateArenaPrice();
  renderLeaderboard();
  renderMatches();
  renderTicker();
}

tick();
setInterval(tick, 2000);
