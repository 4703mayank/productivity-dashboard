// Export (CSV / Excel / PDF) and import (JSON restore).

import { getState, replaceState } from "./store.js";
import { csvEscape, download, fmtTime, fmtDateISO } from "./utils.js";
import { toast } from "./feedback.js";

// ---- CSV ----

export function exportCSV() {
  const { history } = getState();
  const header = ["Time", "Date", "Counter", "Old", "New", "Diff", "Reason"];
  const rows = history.map((e) => {
    const d = new Date(e.time);
    return [
      fmtTime(d),
      fmtDateISO(d),
      e.counterName,
      e.old,
      e.next,
      e.diff,
      e.reason || "",
    ].map(csvEscape).join(",");
  });
  const csv = [header.join(","), ...rows].join("\n");
  download(`la-history-${fmtDateISO(new Date())}.csv`, csv, "text/csv;charset=utf-8");
  toast("History exported as CSV", "info");
}

// ---- Excel (HTML table, .xls opens in Excel) ----

export function exportExcel() {
  const { counters, history, settings } = getState();
  const counterRows = counters
    .map(
      (c) =>
        `<tr><td>${esc(c.name)}</td><td>${c.count}</td><td>${c.ratio}</td><td>${(
          c.count / c.ratio
        ).toFixed(2)}</td></tr>`,
    )
    .join("");

  const historyRows = history
    .slice(0, 1000)
    .map((e) => {
      const d = new Date(e.time);
      return `<tr><td>${fmtTime(d)}</td><td>${fmtDateISO(d)}</td><td>${esc(
        e.counterName,
      )}</td><td>${e.old}</td><td>${e.next}</td><td>${e.diff}</td><td>${esc(
        e.reason || "",
      )}</td></tr>`;
    })
    .join("");

  const html = `<table border="1"><caption>Counters</caption>
    <tr><th>Name</th><th>Count</th><th>Ratio</th><th>Contribution</th></tr>
    ${counterRows}</table>
    <br/>
    <table border="1"><caption>History</caption>
    <tr><th>Time</th><th>Date</th><th>Counter</th><th>Old</th><th>New</th><th>Diff</th><th>Reason</th></tr>
    ${historyRows}</table>`;

  const out = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>${html}</body></html>`;
  download(`la-productivity-${fmtDateISO(new Date())}.xls`, out, "application/vnd.ms-excel");
  toast("Exported as Excel", "info");
}

// ---- PDF (print-to-PDF via a hidden iframe) ----

export function exportPDF() {
  const { counters, history, settings } = getState();
  const win = window.open("", "_blank");
  if (!win) {
    toast("Allow pop-ups to export PDF", "error");
    return;
  }
  const total = counters.reduce((s, c) => s + c.count / c.ratio, 0);
  const rows = counters
    .map(
      (c) =>
        `<tr><td>${esc(c.name)}</td><td>${c.count}</td><td>${c.ratio}</td><td>${(
          c.count / c.ratio
        ).toFixed(2)}</td></tr>`,
    )
    .join("");
  const histRows = history
    .slice(0, 500)
    .map((e) => {
      const d = new Date(e.time);
      return `<tr><td>${fmtTime(d)}</td><td>${fmtDateISO(d)}</td><td>${esc(
        e.counterName,
      )}</td><td>${e.old}</td><td>${e.next}</td><td>${e.diff}</td><td>${esc(
        e.reason || "",
      )}</td></tr>`;
    })
    .join("");

  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>LA Productivity Report</title>
  <style>
    body{font-family:Inter,Arial,sans-serif;padding:32px;color:#1a2438}
    h1{font-size:20px}h2{font-size:16px;margin-top:24px}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
    th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
    th{background:#f1f5f9}
    .muted{color:#666;font-size:12px}
  </style></head><body>
  <h1>LA Productivity Report</h1>
  <p class="muted">Generated ${new Date().toLocaleString()} · Daily target ${settings.dailyTarget} · Total ${total.toFixed(2)}</p>
  <h2>Counters</h2>
  <table><tr><th>Name</th><th>Count</th><th>Ratio</th><th>Contribution</th></tr>${rows}</table>
  <h2>History</h2>
  <table><tr><th>Time</th><th>Date</th><th>Counter</th><th>Old</th><th>New</th><th>Diff</th><th>Reason</th></tr>${histRows}</table>
  <script>window.onload=()=>{window.print()}<\/script>
  </body></html>`);
  win.document.close();
  toast("PDF export ready — use the print dialog", "info");
}

// ---- Import (JSON) ----

export function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.counters || !parsed.history) {
        toast("Invalid backup file", "error");
        return;
      }
      replaceState(parsed);
      toast("Data imported successfully", "success");
    } catch (err) {
      toast("Could not read file: " + err.message, "error");
    }
  };
  reader.readAsText(file);
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
