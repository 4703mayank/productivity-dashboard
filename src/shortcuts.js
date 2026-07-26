// Keyboard shortcuts.
//  <number>      -> increment that counter (1-based)
//  Shift+number  -> decrement that counter
//  Ctrl/Cmd+R    -> reset the currently-selected counter (prevent browser reload)
//  /             -> focus counter search

import { getState } from "./store.js";
import { applyChange } from "./counters.js";

export function initShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Don't hijack typing in inputs/textareas.
    const tag = (e.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || e.target.isContentEditable;
    if (typing && e.key !== "Enter") return;

    // Search focus
    if (e.key === "/" && !typing) {
      e.preventDefault();
      document.getElementById("counterSearch")?.focus();
      return;
    }

    // Number keys 1-9 -> increment / Shift+number -> decrement.
    // Use e.code (stable across shift state / layout) instead of e.key,
    // since Shift+1 yields "!" on most layouts.
    const digitMatch = /^Digit([0-9])$/.exec(e.code);
    const numpadMatch = /^Numpad([0-9])$/.exec(e.code);
    const match = digitMatch || numpadMatch;
    if (match) {
      const n = Number(match[1]);
      if (n === 0) return; // 0 reserved
      const { counters } = getState();
      const counter = counters[n - 1];
      if (!counter) return;
      e.preventDefault();
      const card = document.querySelector(`.counter[data-id="${counter.id}"]`);
      applyChange(counter, e.shiftKey ? -1 : 1, card);
    }
  });
}
