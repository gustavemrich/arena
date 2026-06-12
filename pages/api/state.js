const { kv } = require("@vercel/kv");
const { initState, tick, TICK_MS } = require("../../lib/simulation");

const KEY = "arena_state_v1";
const MAX_TICKS_PER_REQUEST = 20;

module.exports = async function handler(req, res) {
  let state = await kv.get(KEY);

  if (!state) {
    state = initState();
  }

  const now = Date.now();
  const elapsed = now - (state.lastUpdate || now);
  const ticks = Math.min(Math.floor(elapsed / TICK_MS), MAX_TICKS_PER_REQUEST);

  for (let i = 0; i < ticks; i++) {
    tick(state);
  }
  if (ticks > 0) {
    state.lastUpdate += ticks * TICK_MS;
  }

  await kv.set(KEY, state);

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(state);
};
