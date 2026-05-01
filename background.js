const SCHEMA_VERSION = 1;
const TTL_MS = 3 * 60 * 1000;
const SWEEP_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const SWEEP_PROBABILITY = 0.05;
const KEY_PREFIX = "story_";

const inflight = new Map();

async function doFetch(storyId) {
  const key = KEY_PREFIX + storyId;
  const url = `https://hn.algolia.com/api/v1/search?tags=comment,story_${storyId}&hitsPerPage=1000`;
  let data;
  try {
    const res = await fetch(url);
    if (!res.ok) return { n: [], cached: false };
    data = await res.json();
  } catch {
    return { n: [], cached: false };
  }

  const seen = new Map();
  for (const h of data.hits || []) {
    const a = h.author;
    if (!a || !NOTABLES[a]) continue;
    if (!seen.has(a)) seen.set(a, h.objectID);
  }
  const out = [];
  for (const [handle, commentId] of seen) out.push({ handle, commentId });

  try {
    await browser.storage.local.set({
      [key]: { v: SCHEMA_VERSION, t: Date.now(), n: out }
    });
  } catch {}

  if (Math.random() < SWEEP_PROBABILITY) sweepOldEntries();

  return { n: out, cached: false };
}

async function fetchStoryNotables(storyId) {
  const key = KEY_PREFIX + storyId;
  const stored = await browser.storage.local.get(key);
  const cached = stored[key];
  if (
    cached &&
    cached.v === SCHEMA_VERSION &&
    typeof cached.t === "number" &&
    Date.now() - cached.t < TTL_MS
  ) {
    return { n: cached.n, cached: true };
  }

  if (inflight.has(storyId)) return inflight.get(storyId);
  const p = doFetch(storyId).finally(() => inflight.delete(storyId));
  inflight.set(storyId, p);
  return p;
}

async function sweepOldEntries() {
  try {
    const all = await browser.storage.local.get(null);
    const cutoff = Date.now() - SWEEP_MAX_AGE_MS;
    const stale = [];
    for (const [k, v] of Object.entries(all)) {
      if (!k.startsWith(KEY_PREFIX)) continue;
      // Drop if missing/old schema, missing timestamp, or past cutoff.
      if (!v || v.v !== SCHEMA_VERSION || typeof v.t !== "number" || v.t < cutoff) {
        stale.push(k);
      }
    }
    if (stale.length) await browser.storage.local.remove(stale);
  } catch {}
}

sweepOldEntries();

browser.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "fetchStory" && msg.storyId) {
    return fetchStoryNotables(String(msg.storyId));
  }
});
