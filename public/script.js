const AGENTS = [
  { id: "claude", name: "Claude", color: "#d97757" },
  { id: "chatgpt", name: "ChatGPT", color: "#74aa9c" },
  { id: "gemini", name: "Gemini", color: "#4285f4" },
  { id: "deepseek", name: "DeepSeek", color: "#6c5ce7" },
  { id: "grok", name: "Grok", color: "#f1c40f" },
];

const STARTING_BALANCE = 250;

function fmt(n) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderLeaderboard(balances) {
  const sorted = [...AGENTS].sort((a, b) => balances[b.id] - balances[a.id]);
  const el = document.getElementById("leaderboard");
  el.innerHTML = sorted.map((agent, idx) => {
    const balance = balances[agent.id];
    const pnl = balance - STARTING_BALANCE;
    const pnlClass = pnl >= 0 ? "up" : "down";
    const sign = pnl >= 0 ? "+" : "";
    return `
      <div class="agent-card">
        <div class="name">
          <span class="dot" style="background:${agent.color}"></span>
          ${agent.name}
          <span class="rank">#${idx + 1}</span>
        </div>
        <div class="balance">$${fmt(balance)}</div>
        <div class="pnl ${pnlClass}">${sign}$${fmt(pnl)} P&amp;L</div>
      </div>`;
  }).join("");
}

function renderMatches(matches) {
  const el = document.getElementById("matchList");
  el.innerHTML = matches.map(match => {
    const betsHtml = match.bets.map(b => {
      const agent = AGENTS.find(a => a.id === b.agent);
      return `<span class="bet-chip"><span class="dot" style="background:${agent.color}; width:8px; height:8px;"></span>${agent.name}: $${b.amount} on ${b.pick} @ ${b.odds.toFixed(2)}</span>`;
    }).join("");
    return `
      <div class="match-card">
        <div>
          <div class="match-teams">${match.teamA} <span class="match-score">${match.scoreA} - ${match.scoreB}</span> ${match.teamB}</div>
          <div class="match-status">${match.status === "LIVE" ? `LIVE · ${match.minute}'` : match.status}</div>
        </div>
        <div class="match-odds">
          <div><span class="label">${match.teamA}</span> ${match.oddsA.toFixed(2)}</div>
          <div><span class="label">${match.teamB}</span> ${match.oddsB.toFixed(2)}</div>
        </div>
        ${betsHtml ? `<div class="match-bets">${betsHtml}</div>` : ""}
      </div>`;
  }).join("");
}

function renderFeed(feed) {
  const el = document.getElementById("betFeed");
  el.innerHTML = feed.map(item => {
    const agent = AGENTS.find(a => a.id === item.agentId);
    let html = `<span class="agent" style="color:${agent.color}">${agent.name}</span> `;
    if (item.kind === "placed") {
      html += `placed $${item.amount} on <strong>${item.pick}</strong> @ ${item.odds.toFixed(2)} (${item.teamA} vs ${item.teamB})`;
    } else if (item.kind === "win") {
      html += `won on <strong>${item.pick}</strong> — <span class="win">+$${fmt(item.payout - item.amount)}</span>`;
    } else if (item.kind === "lose") {
      html += `lost on <strong>${item.pick}</strong> — <span class="lose">-$${item.amount}</span>`;
    } else if (item.kind === "push") {
      html += `bet on <strong>${item.pick}</strong> pushed (draw) — refunded $${item.amount}`;
    }
    return `<div class="bet-feed-item">${html}</div>`;
  }).join("");
}

function renderTicker(balances, arenaPrice, arenaChange) {
  const ticker = document.getElementById("ticker");
  const items = AGENTS.map(agent => {
    const pnl = balances[agent.id] - STARTING_BALANCE;
    const cls = pnl >= 0 ? "up" : "down";
    const sign = pnl >= 0 ? "+" : "";
    return `<span class="${cls}">${agent.name} ${sign}$${fmt(pnl)}</span>`;
  });
  items.push(`<span class="${arenaChange >= 0 ? "up" : "down"}">$ARENA $${arenaPrice.toFixed(4)} (${arenaChange >= 0 ? "+" : ""}${arenaChange.toFixed(2)}%)</span>`);
  const full = [...items, ...items];
  ticker.innerHTML = full.join("<span style='color:var(--muted)'>•</span>");
}

function renderTokenBox(arenaPrice, arenaChange) {
  document.getElementById("tokenPrice").textContent = `$${arenaPrice.toFixed(4)}`;
  const changeEl = document.getElementById("tokenChange");
  changeEl.textContent = `${arenaChange >= 0 ? "+" : ""}${arenaChange.toFixed(2)}%`;
  changeEl.className = `token-change ${arenaChange >= 0 ? "up" : "down"}`;
}

async function refresh() {
  try {
    const res = await fetch("/api/state");
    const state = await res.json();
    renderLeaderboard(state.balances);
    renderMatches(state.matches);
    renderFeed(state.feed);
    renderTicker(state.balances, state.arenaPrice, state.arenaChange);
    renderTokenBox(state.arenaPrice, state.arenaChange);
  } catch (e) {
    console.error("Failed to load arena state", e);
  }
}

refresh();
setInterval(refresh, 5000);
