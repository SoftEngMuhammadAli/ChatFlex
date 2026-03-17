import { THEME_COLORS } from "../styles/globalThemeTokens";

const TOAST_ROOT_ID = "chatflex-toast-root";

function ensureToastRoot() {
  let root = document.getElementById(TOAST_ROOT_ID);
  if (root) return root;

  root = document.createElement("div");
  root.id = TOAST_ROOT_ID;
  root.style.position = "fixed";
  root.style.top = "16px";
  root.style.right = "16px";
  root.style.zIndex = "2147483646";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "8px";
  document.body.appendChild(root);
  return root;
}

export function showChatToast(message, tone = "info") {
  if (!message) return;
  const root = ensureToastRoot();
  const toast = document.createElement("div");

  const bg =
    tone === "receive"
      ? THEME_COLORS.toastReceive
      : tone === "send"
        ? THEME_COLORS.toastSend
        : THEME_COLORS.toastInfo;
  toast.style.background = bg;
  toast.style.color = THEME_COLORS.toastOn;
  toast.style.padding = "10px 12px";
  toast.style.borderRadius = "10px";
  toast.style.font = "600 12px/1.35 Inter, system-ui, sans-serif";
  toast.style.boxShadow = "0 8px 20px rgba(15,23,42,.18)";
  toast.textContent = message;

  root.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 2200);
}

let audioCtx = null;
function getAudioContext() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  return audioCtx;
}

export function playChatSound(kind = "receive") {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = kind === "send" ? 620 : 860;
  gain.gain.value = 0.0001;
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  osc.start(now);
  osc.stop(now + 0.17);
}

export async function ensureNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch (_error) {
    console.log("Something Error Occured!", _error);
  }
}

export async function showBrowserNotification(title, body) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  const permission = await ensureNotificationPermission();
  if (permission !== "granted") return;

  try {
    new Notification(title, { body });
  } catch (_error) {
    console.log("Something Error Occured!", _error);
  }
}

export function notifyMessageSent() {
  playChatSound("send");
  showChatToast("Message sent", "send");
}

export async function notifyMessageReceived(title, body) {
  playChatSound("receive");
  showChatToast("New message received", "receive");
  if (document.hidden) {
    await showBrowserNotification(title, body);
  }
}
