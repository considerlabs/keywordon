import crypto from "node:crypto";

const PREFIX = "v1";

function resolveKey(): Buffer {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error("SETTINGS_ENCRYPTION_KEY가 없습니다.");
  }

  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    key = Buffer.from(raw, "base64");
  }

  if (key.length !== 32) {
    throw new Error("SETTINGS_ENCRYPTION_KEY는 32바이트(hex 64자 또는 base64)여야 합니다.");
  }
  return key;
}

export function hasEncryptionKey(): boolean {
  try {
    resolveKey();
    return true;
  } catch {
    return false;
  }
}

/** Returns `v1.<iv_b64>.<tag_b64>.<ciphertext_b64>` */
export function encryptSetting(plaintext: string): string {
  const key = resolveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(
    ".",
  );
}

export function decryptSetting(payload: string): string {
  const key = resolveKey();
  const [version, ivB64, tagB64, dataB64] = payload.split(".");
  if (version !== PREFIX || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("암호화된 설정 형식이 올바르지 않습니다.");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
