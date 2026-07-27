import { getState, setState, updateCounter, addHistoryEntry } from "./store.js";
import { contribution, fmtTime, round2, uid } from "./utils.js";
import { toast, playSound, reasonDialog, confirmDialog } from "./feedback.js";

let selectedId = null;
let searchQuery = "";

const gridEl = () => document.getElementById("countersGrid");

export function setSelected(id) {
  selectedId = id;
  document.querySelectorAll(".counter").forEach((el) => {
    el.classList.toggle("is-selected", el.dataset.id === id);
  });
}

export function setSearch(q) {
  searchQuery = q.toLowerCase();
  renderCounters();
}

export function renderCounters() {
  const { counters } = getState();
  const grid = gridEl();
  if (!grid) return;

  const visible = counters.filter((c) =>
    searchQuery ? c.name.toLowerCase().includes(searchQuery) : true,
  );

  document.getElementById("visibleCount").textContent =
    searchQuery ? `${visible.length} of ${counters.length} counters` : `${counters.length} counters`;

  grid.innerHTML = "";
  visible.forEach((counter) => {
    const realIndex = counters.indexOf(counter);
    grid.appendChild(buildCard(counter, realIndex));
  });
}

function buildCard(counter, index) {
  const card = document.createElement("div");
  card.className = "counter";
  card.dataset.id = counter.id;
  if (counter.id === selectedId) card.classList.add("is-selected");
  if (counter.includeInTotal === false) card.classList.add("is-excluded");

  const contrib = contribution(counter);

  card.innerHTML = `
    <div class="counter__head">
      <input class="counter__title" type="text" spellcheck="false" value="${escapeHtml(counter.name)}" />
      <div class="counter__head-right">
        <label class="counter__ratio" title="Contribution ratio (÷N). 3 means every 3 counts as 1.">
          <span>÷</span>
          <input type="number" min="1" step="1" value="${counter.ratio}" data-ratio />
        </label>
        <button class="counter__del" data-act="del" title="Delete counter" aria-label="Delete counter">×</button>
      </div>
    </div>

    <div class="counter__toggle-row">
      <label class="counter__toggle" title="Include this counter in the total sum">
        <input type="checkbox" data-include ${counter.includeInTotal !== false ? "checked" : ""} />
        <span class="counter__toggle-track"><span class="counter__toggle-thumb"></span></span>
      </label>
      <span class="counter__toggle-label">Count in total</span>
    </div>

    <div class="counter__count">
      <input type="number" min="0" step="1" value="${counter.count}" data-count aria-label="Count" />
    </div>
    <div class="counter__contribution">
      contribution <b>${round2(contrib).toFixed(2)}</b>
      ${counter.includeInTotal === false ? '<span class="counter__excluded-tag">Not counted</span>' : ""}
    </div>
    <div class="counter__btns">
      <button class="counter__btn counter__btn--inc" data-act="inc">+1</button>
      <button class="counter__btn counter__btn--dec" data-act="dec">−1</button>
      <button class="counter__btn counter__btn--reset" data-act="reset">Reset</button>
    </div>
    <div class="counter__foot">${counter.lastUpdated ? "Last updated " + fmtTime(new Date(counter.lastUpdated)) : "—"}</div>
  `;

  const includeEl = card.querySelector("[data-include]");
  includeEl.addEventListener("change", () => {
    updateCounter(counter.id, { includeInTotal: includeEl.checked });
  });

  const titleEl = card.querySelector(".counter__title");
  titleEl.addEventListener("change", () => {
    updateCounter(counter.id, { name: titleEl.value.trim() || `Counter ${index + 1}` });
  });

  const ratioEl = card.querySelector("[data-ratio]");
  ratioEl.addEventListener("change", () => {
    const v = Math.max(1, Number(ratioEl.value) || 1);
    updateCounter(counter.id, { ratio: v });
    ratioEl.value = v;
  });

  const countEl = card.querySelector("[data-count]");
  countEl.addEventListener("change", () => {
    const v = Math.max(0, Math.round(Number(countEl.value) || 0));
    setCount(counter, v, card);
    countEl.value = v;
  });
  countEl.addEventListener("click", () => setSelected(counter.id));

  card.addEventListener("click", (e) => {
    if (e.target === titleEl || e.target === ratioEl || e.target === countEl || e.target === includeEl) return;
    setSelected(counter.id);
    const act = e.target?.dataset.act;
    if (!act) return;
    handleAction(counter.id, act, card, e.altKey);
  });

  return card;
}

async function handleAction(id, act, card, withReason = false) {
  const { counters } = getState();
  const counter = counters.find((c) => c.id === id);
  if (!counter) return;

  if (act === "del") {
    deleteCounter(counter.id);
    return;
  }

  if (act === "reset") {
    resetCounter(counter, card);
    return;
  }

  const delta = act === "inc" ? 1 : act === "dec" ? -1 : 0;
  if (!delta) return;

  const reason = withReason ? await reasonDialog() : null;
  applyChange(counter, delta, card, reason);
}

export function applyChange(counter, delta, card, reason = null) {
  const oldValue = counter.count;
  const newValue = Math.max(0, oldValue + delta);
  if (newValue === oldValue) return;
  commitCount(counter, oldValue, newValue, delta, card, reason);

  const { settings } = getState();
  playSound(settings.sounds);
  toast(`${counter.name} ${delta > 0 ? "+" : ""}${delta}`, delta > 0 ? "success" : "error");
}

function setCount(counter, next, card, reason = "Manual edit") {
  const oldValue = counter.count;
  const newValue = Math.max(0, Math.round(next));
  if (newValue === oldValue) return;
  const diff = newValue - oldValue;
  commitCount(counter, oldValue, newValue, diff, card, reason);
  toast(`${counter.name} set to ${newValue}`, "info");
}

async function resetCounter(counter, card) {
  if (counter.count === 0) {
    toast(`${counter.name} already at 0`, "info");
    return;
  }
  const ok = await confirmDialog({
    title: `Reset "${counter.name}"?`,
    text: `This counter (${counter.count}) will be set to 0. The action is logged in history.`,
    confirmLabel: "Reset",
  });
  if (!ok) return;
  commitCount(counter, counter.count, 0, -counter.count, card, "Reset");
  toast(`${counter.name} reset`, "info");
}

function commitCount(counter, oldValue, newValue, diff, card, reason) {
  const now = Date.now();
  updateCounter(counter.id, {
    count: newValue,
    clicks: counter.clicks + 1,
    increments: counter.increments + (diff > 0 ? 1 : 0),
    decrements: counter.decrements + (diff < 0 ? 1 : 0),
    lastUpdated: now,
  });

  addHistoryEntry({
    id: uid("h"),
    time: now,
    counterId: counter.id,
    counterName: counter.name,
    old: oldValue,
    next: newValue,
    diff,
    reason,
  });

  if (card) {
    const countEl = card.querySelector("[data-count]");
    if (countEl && document.activeElement !== countEl) countEl.value = newValue;
    card.classList.remove("is-updating");
    void card.offsetWidth;
    card.classList.add("is-updating");
  }
}

async function deleteCounter(id) {
  const { counters } = getState();
  const counter = counters.find((c) => c.id === id);
  if (!counter) return;
  const ok = await confirmDialog({
    title: `Delete "${counter.name}"?`,
    text: "The counter and its count will be removed. History entries are kept.",
    confirmLabel: "Delete",
  });
  if (!ok) return;
  setState((s) => ({ ...s, counters: s.counters.filter((c) => c.id !== id) }));
  toast("Counter deleted", "info");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}