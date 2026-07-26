// User feedback: toast notifications, optional click sounds, and a
// reusable confirm() modal that returns a Promise<boolean>.

// ---- Toasts ----

const toastsEl = () => document.getElementById("toasts");

export function toast(message, type = "success") {
  const el = document.createElement("div");
  el.className = `toast toast--${type}`;
  el.textContent = message;
  toastsEl()?.appendChild(el);
  setTimeout(() => {
    el.classList.add("out");
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }, 2200);
}

// ---- Sound ----

let audioCtx = null;
export function playSound(enabled) {
  if (!enabled) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = 720;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch {
    // AudioContext not available; ignore silently.
  }
}

// ---- Confirm modal ----

export function confirmDialog({ title, text, confirmLabel = "Confirm", danger = true }) {
  return new Promise((resolve) => {
    const modal = document.getElementById("modal");
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalText").textContent = text;
    const confirmBtn = document.getElementById("modalConfirm");
    confirmBtn.textContent = confirmLabel;
    confirmBtn.className = danger ? "btn btn--danger" : "btn btn--primary";

    modal.hidden = false;

    const close = (result) => {
      modal.hidden = true;
      modal.removeEventListener("click", onBackdrop);
      confirmBtn.removeEventListener("click", onConfirm);
      document.removeEventListener("keydown", onKey);
      resolve(result);
    };

    const onBackdrop = (e) => {
      if (e.target.dataset.close !== undefined) close(false);
    };
    const onConfirm = () => close(true);
    const onKey = (e) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };

    modal.addEventListener("click", onBackdrop);
    confirmBtn.addEventListener("click", onConfirm);
    document.addEventListener("keydown", onKey);
  });
}

// ---- Optional reason modal (returns string or null) ----

export function reasonDialog() {
  return new Promise((resolve) => {
    const modal = document.getElementById("reasonModal");
    const input = document.getElementById("reasonInput");
    const confirmBtn = document.getElementById("reasonConfirm");
    input.value = "";
    modal.hidden = false;
    input.focus();

    const close = (result) => {
      modal.hidden = true;
      modal.removeEventListener("click", onBackdrop);
      confirmBtn.removeEventListener("click", onConfirm);
      input.removeEventListener("keydown", onKey);
      resolve(result);
    };

    const onBackdrop = (e) => {
      if (e.target.dataset.reasonClose !== undefined) close(null);
    };
    const onConfirm = () => close(input.value.trim() || null);
    const onKey = (e) => {
      if (e.key === "Escape") close(null);
      if (e.key === "Enter") close(input.value.trim() || null);
    };

    modal.addEventListener("click", onBackdrop);
    confirmBtn.addEventListener("click", onConfirm);
    input.addEventListener("keydown", onKey);
  });
}
