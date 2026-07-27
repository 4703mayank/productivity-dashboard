import "./style.css";
import { subscribe, getState, setState, resetAll } from "./src/store.js";
import { startClock, renderSummary, initSummaryTarget, initHourlyTarget } from "./src/summary.js";
import { renderCounters, setSearch } from "./src/counters.js";
import { initHistory, populateCounterFilter, renderHistory } from "./src/history.js";
import { initShortcuts } from "./src/shortcuts.js";
import { exportCSV, exportExcel, exportPDF, importData } from "./src/export.js";
import { uid } from "./src/utils.js";
import { toast, confirmDialog } from "./src/feedback.js";


// ---- Boot ----

const { settings } = getState();
applyTheme(settings.theme);
renderCounters();
populateCounterFilter();
renderHistory();
startClock();
initSummaryTarget();
initHourlyTarget();
initHistory();
initShortcuts();
initNav();
initSearch();
initThemeToggle();
initDataBar();

subscribe(() => {
  renderCounters();
  renderSummary();
  renderHistory();
  populateCounterFilter();
});

// ---- Theme ----

function applyTheme(value) {
  document.documentElement.dataset.theme = value;
  setState((s) => ({ ...s, settings: { ...s.settings, theme: value } }));
}

function initThemeToggle() {
  document.getElementById("themeToggle").addEventListener("click", () => {
    const current = document.documentElement.dataset.theme;
    applyTheme(current === "dark" ? "light" : "dark");
  });
}

// ---- View navigation ----

function initNav() {
  document.querySelectorAll(".nav__btn").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });
}

function switchView(name) {
  document.querySelectorAll(".nav__btn").forEach((b) =>
    b.classList.toggle("is-active", b.dataset.view === name),
  );
  document.querySelectorAll(".view").forEach((v) =>
    v.classList.toggle("is-active", v.dataset.view === name),
  );
  if (name === "history") renderHistory();
}

// ---- Counter search ----

function initSearch() {
  document.getElementById("counterSearch").addEventListener("input", (e) =>
    setSearch(e.target.value),
  );
}

// ---- Add counter + data bar ----

function initDataBar() {
  document.getElementById("addCounterBtn").addEventListener("click", addCounter);

  document.getElementById("exportCsvBtn").addEventListener("click", exportCSV);
  document.getElementById("exportExcelBtn").addEventListener("click", exportExcel);
  document.getElementById("exportPdfBtn").addEventListener("click", exportPDF);
  document.getElementById("importBtn").addEventListener("click", () =>
    document.getElementById("importFile").click(),
  );
  document.getElementById("importFile").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) importData(file);
    e.target.value = "";
  });
  document.getElementById("resetAllBtn").addEventListener("click", fullReset);
}

function addCounter() {
  const { counters } = getState();
  setState((s) => ({
    ...s,
    counters: [
      ...s.counters,
      {
        id: uid("c"),
        name: `Counter ${counters.length + 1}`,
        count: 0,
        ratio: 1,
        includeInTotal: true,   
        clicks: 0,
        increments: 0,
        decrements: 0,
        lastUpdated: null,
      },
    ],
  }));
  toast("Counter added", "success");
}

async function fullReset() {
  const ok = await confirmDialog({
    title: "Reset entire dashboard?",
    text: "All counters and history will be wiped. Your targets and theme are kept. This cannot be undone.",
    confirmLabel: "Reset everything",
  });
  if (!ok) return;
  resetAll();
  toast("Dashboard reset", "info");
}
