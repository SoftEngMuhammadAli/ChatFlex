export function uid(prefix) {
  return (prefix || "id") + "_" + Math.random().toString(36).slice(2, 12);
}

export function normalizeHost(apiHost) {
  return String(apiHost || "").replace(/\/+$/, "");
}

export function normalizeId(value) {
  return value ? String(value) : "";
}

export function getThreadKey(a, b) {
  const first = normalizeId(a);
  const second = normalizeId(b);
  if (!first || !second) return "";
  return [first, second].sort().join(":");
}

let audioCtx = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  return audioCtx;
}

export function playWidgetMessageSound(kind = "receive") {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = kind === "send" ? 620 : 880;
  gain.gain.value = 0.0001;

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  oscillator.start(now);
  oscillator.stop(now + 0.17);
}
