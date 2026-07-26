// Central localStorage-backed store for the LA Productivity Dashboard.
// Single source of truth; modules subscribe to changes via the pub/sub below.

const KEY = "la-productivity-v2";

const defaultCounters = ["Submitted", "IP Pool", "Review"];

const defaultRatios = [1, 3, 5];

function buildDefaultState() {
  return {
    settings: {
      theme: "light",
      dailyTarget: 150,
      hourlyTarget: 16,
      workStart: "09:00",
      workEnd: "18:00",
      sounds: false,
    },
    counters: defaultCounters.map((name, i) => ({
      id: `c${Date.now()}_${i}`,
      name,
      count: 0,
      ratio: defaultRatios[i] ?? 1,
      clicks: 0,
      increments: 0,
      decrements: 0,
      lastUpdated: null,
    })),
    history: [],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return buildDefaultState();
    const parsed = JSON.parse(raw);
    const base = buildDefaultState();
    // Shallow-merge to tolerate older saves missing new fields.
    return {
      settings: { ...base.settings, ...(parsed.settings || {}) },
      counters: Array.isArray(parsed.counters) ? parsed.counters : base.counters,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch (err) {
    console.error("Failed to load state, starting fresh:", err);
    return buildDefaultState();
  }
}

let state = load();
const listeners = new Set();

export function getState() {
  return state;
}

export function setState(next) {
  state = typeof next === "function" ? next(state) : { ...state, ...next };
  persist();
  emit();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Failed to save state:", err);
  }
}

function emit() {
  listeners.forEach((fn) => fn(state));
}

// ---- High-level mutations ----

export function updateCounter(id, patch) {
  setState((s) => ({
    ...s,
    counters: s.counters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  }));
}

export function addHistoryEntry(entry) {
  setState((s) => ({ ...s, history: [entry, ...s.history].slice(0, 5000) }));
}

export function replaceState(next) {
  state = next;
  persist();
  emit();
}

export function resetAll() {
  const fresh = buildDefaultState();
  // Preserve theme + targets so a "reset entire dashboard" doesn't blow away prefs.
  fresh.settings = state.settings;
  replaceState(fresh);
}
