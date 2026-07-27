import { getState, setState } from "./store.js";
import {
  fmtDate,
  fmtTime,
  round2,
  totalContribution,
  workWindow,
} from "./utils.js";

export function startClock() {
  tick();
  setInterval(tick, 1000);
}

function tick() {
  const now = new Date();
  document.getElementById("clockDate").textContent = fmtDate(now);
  document.getElementById("clockTime").textContent = fmtTime(now);
  renderSummary();
}

export function renderSummary() {
  const { counters, settings } = getState();
  const total = totalContribution(counters);
  const dailyTarget = Number(settings.dailyTarget) || 0;
  const hourlyTarget = Number(settings.hourlyTarget) || 0;
  
  // Daily — total / editable target. Percentage is uncapped.
  const dailyRemaining = Math.max(0, dailyTarget - total);
  const dailyPct = dailyTarget > 0 ? (total / dailyTarget) * 100 : 0;
  document.getElementById("sumTotal").textContent = round2(total).toFixed(2);
  document.getElementById("sumDailyDone").textContent = round2(total).toFixed(0);
  const dailyInput = document.getElementById("sumDailyTargetInput");
  if (dailyInput && document.activeElement !== dailyInput) {
    dailyInput.value = dailyTarget;
  }
  document.getElementById("dailyBar").style.width = `${Math.min(100, dailyPct)}%`;
  document.getElementById("sumDailyPct").textContent = `${dailyPct.toFixed(2)}%`;
  document.getElementById("sumDailyRemain").textContent = `Remaining ${round2(dailyRemaining).toFixed(2)}`;

  // Hourly — same pattern as daily: total / editable target. Percentage uncapped.
  const hourlyRemaining = Math.max(0, hourlyTarget - total);
  const hourlyPct = hourlyTarget > 0 ? (total / hourlyTarget) * 100 : 0;
  document.getElementById("sumHourlyDone").textContent = round2(total).toFixed(0);
  const hourlyInput = document.getElementById("sumHourlyTargetInput");
  if (hourlyInput && document.activeElement !== hourlyInput) {
    hourlyInput.value = hourlyTarget;
  }
  document.getElementById("hourlyBar").style.width = `${Math.min(100, hourlyPct)}%`;
  document.getElementById("sumHourlyPct").textContent = `${hourlyPct.toFixed(2)}%`;
  document.getElementById("sumHourlyRemain").textContent = `Remaining ${round2(hourlyRemaining).toFixed(2)}`;
}

export function initSummaryTarget() {
  const input = document.getElementById("sumDailyTargetInput");
  if (!input) return;
  input.addEventListener("change", () => {
    const v = Math.max(1, Number(input.value) || 1);
    setState((s) => ({ ...s, settings: { ...s.settings, dailyTarget: v } }));
    input.value = v;
  });
}

export function initHourlyTarget() {
  const input = document.getElementById("sumHourlyTargetInput");
  if (!input) return;
  input.addEventListener("change", () => {
    const v = Math.max(1, Number(input.value) || 1);
    setState((s) => ({ ...s, settings: { ...s.settings, hourlyTarget: v } }));
    input.value = v;
  });
}
