// History view: filters + render. Filters are module-scoped and re-applied on
// every state change.

import { getState, subscribe } from "./store.js";
import { fmtTime, fmtDateISO } from "./utils.js";

const filters = {
  search: "",
  counterId: "",
  dir: "",
  date: "",
  range: "",
};

export function initHistory() {
  document.getElementById("historySearch").addEventListener("input", (e) => {
    filters.search = e.target.value.toLowerCase();
    renderHistory();
  });
  document.getElementById("filterCounter").addEventListener("change", (e) => {
    filters.counterId = e.target.value;
    renderHistory();
  });
  document.getElementById("filterDir").addEventListener("change", (e) => {
    filters.dir = e.target.value;
    renderHistory();
  });
  document.getElementById("filterDate").addEventListener("change", (e) => {
    filters.date = e.target.value;
    renderHistory();
  });
  document.getElementById("filterRange").addEventListener("change", (e) => {
    filters.range = e.target.value;
    renderHistory();
  });
  subscribe(renderHistory);
}

export function populateCounterFilter() {
  const { counters } = getState();
  const sel = document.getElementById("filterCounter");
  const current = sel.value;
  sel.innerHTML = '<option value="">All counters</option>';
  counters.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
  sel.value = current;
}

export function renderHistory() {
  const { history } = getState();
  const body = document.getElementById("historyBody");
  const empty = document.getElementById("historyEmpty");

  // history is stored newest-first. Compute TPT (time since the previous
  // entry overall, i.e. the next-older entry) BEFORE filtering, so gaps
  // stay accurate regardless of which entries are currently filtered out.
  const tptById = computeTPT(history);

  const filtered = applyFilters(history);
  document.getElementById("historyCount").textContent = `${filtered.length} entries`;

  body.innerHTML = "";
  if (filtered.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  // Render newest first (history is already stored newest-first).
  const frag = document.createDocumentFragment();
  for (const entry of filtered.slice(0, 500)) {
    frag.appendChild(buildRow(entry, tptById.get(entry)));
  }
  body.appendChild(frag);
}

// Maps each entry -> ms since the chronologically previous entry overall.
// Since `history` is newest-first, the "previous" entry for history[i] is
// history[i + 1]. The oldest entry (last in the array) has no previous
// entry, so it maps to null.
function computeTPT(history) {
  const map = new Map();
  for (let i = 0; i < history.length; i++) {
    const entry = history[i];
    const older = history[i + 1];
    map.set(entry, older ? entry.time - older.time : null);
  }
  return map;
}

function formatTPT(ms) {
  if (ms == null || ms < 0) return "—";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function applyFilters(history) {
  const { counters, settings } = getState();
  const win = settings.workStart && settings.workEnd;
  return history.filter((entry) => {
    if (filters.counterId && entry.counterId !== filters.counterId) return false;
    if (filters.dir === "inc" && entry.diff <= 0) return false;
    if (filters.dir === "dec" && entry.diff >= 0) return false;
    if (filters.date && fmtDateISO(new Date(entry.time)) !== filters.date) return false;
    if (filters.search) {
      const hay = `${entry.counterName} ${entry.reason || ""}`.toLowerCase();
      if (!hay.includes(filters.search)) return false;
    }
    if (filters.range && win) {
      const d = new Date(entry.time);
      const mins = d.getHours() * 60 + d.getMinutes();
      const startMins = toMins(settings.workStart);
      const endMins = toMins(settings.workEnd);
      if (filters.range === "morning" && !(mins >= startMins && mins < 720)) return false;
      if (filters.range === "afternoon" && !(mins >= 720 && mins <= endMins)) return false;
    }
    return true;
  });
}

function toMins(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function buildRow(entry, tptMs) {
  const d = new Date(entry.time);
  const tr = document.createElement("tr");
  const diffClass = entry.diff > 0 ? "diff-pos" : entry.diff < 0 ? "diff-neg" : "diff-zero";
  const diffSign = entry.diff > 0 ? "+" : "";
  tr.innerHTML = `
    <td class="mono">${fmtTime(d)}</td>
    <td>${fmtDateISO(d)}</td>
    <td>${escapeHtml(entry.counterName)}</td>
    <td class="mono">${entry.old} → ${entry.next}</td>
    <td class="mono ${diffClass}">${diffSign}${entry.diff}</td>
    <td class="mono">${formatTPT(tptMs)}</td>
  `;
  return tr;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}