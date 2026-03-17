import crypto from "crypto";

const KEY_ENV = "CHATFLEX_ENCRYPTION_KEY";
const PREFIX = "enc:v1:";

const getKey = () => {
  const raw = String(process.env[KEY_ENV] || "").trim();
  if (!raw) return null;
  try {
    const buf = Buffer.from(raw, "base64");
    if (buf.length !== 32) return null;
    return buf;
  } catch {
    return null;
  }
};

export const isEncryptedValue = (value) =>
  typeof value === "string" && value.startsWith(PREFIX);

export const encryptSecret = (plainText) => {
  const text = String(plainText ?? "");
  if (!text) return "";
  if (isEncryptedValue(text)) return text;

  const key = getKey();
  if (!key) return text; // best-effort: preserve existing behavior if key not configured

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("base64")}.${tag.toString("base64")}.${ciphertext.toString("base64")}`;
};

export const decryptSecret = (value) => {
  const text = String(value ?? "");
  if (!text) return "";
  if (!isEncryptedValue(text)) return text;

  const key = getKey();
  if (!key) return "";

  const payload = text.slice(PREFIX.length);
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) return "";

  try {
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const data = Buffer.from(dataB64, "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(data), decipher.final()]);
    return plain.toString("utf8");
  } catch {
    return "";
  }
};

