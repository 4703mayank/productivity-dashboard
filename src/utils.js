// Small pure helpers shared across modules.

export function uid(prefix = "c") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

// Round to 2 decimals without floating-point noise (e.g. 13.005 -> 13.01).
export function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

// Contribution of a counter toward the total, honouring its ratio.
export function contribution(counter) {
  return counter.ratio > 0 ? counter.count / counter.ratio : 0;
}

// Only counters with includeInTotal !== false count toward the sum;
// contribution() itself is untouched so a card can still show its own
// number even while excluded from the total.
export function totalContribution(counters) {
  return counters
    .filter((c) => c.includeInTotal !== false)
    .reduce((sum, c) => sum + contribution(c), 0);
}

// ---- Time / date formatting ----

export function fmtTime(date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function fmtTimeShort(date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function fmtDate(date) {
  return date.toLocaleDateString([], {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function fmtDateISO(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fmtDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

// Parse "HH:MM" into minutes since midnight.
export function timeToMinutes(hhmm) {
  if (!hhmm || !hhmm.includes(":")) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToHHMM(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = Math.round(mins % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Working-window math. Returns minutes-based figures used by summary cards.
export function workWindow(settings, now = new Date()) {
  const start = timeToMinutes(settings.workStart);
  const end = timeToMinutes(settings.workEnd);
  const total = Math.max(0, end - start);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const elapsed = clamp(nowMin - start, 0, total);
  return { start, end, total, elapsed, nowMin };
}

// ---- CSV helpers ----

export function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function download(filename, content, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}