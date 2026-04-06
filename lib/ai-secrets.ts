import crypto from "node:crypto";

function getSecret() {
  return process.env.AI_PROVIDER_ENCRYPTION_KEY?.trim() || "";
}

function getKeyBuffer(secret: string) {
  return crypto.createHash("sha256").update(secret).digest();
}

export function hasAiEncryptionSecret() {
  return Boolean(getSecret());
}

export function createApiKeyFingerprint(value: string) {
  const digest = crypto.createHash("sha256").update(value).digest("hex").toUpperCase();
  return digest.slice(0, 12);
}

export function encryptApiKey(value: string) {
  const secret = getSecret();
  if (!secret) {
    throw new Error("AI_PROVIDER_ENCRYPTION_KEY is missing");
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKeyBuffer(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64")
  };
}

export function decryptApiKey(input: { ciphertext: string; iv: string; tag: string }) {
  const secret = getSecret();
  if (!secret) {
    throw new Error("AI_PROVIDER_ENCRYPTION_KEY is missing");
  }

  const decipher = crypto.createDecipheriv("aes-256-gcm", getKeyBuffer(secret), Buffer.from(input.iv, "base64"));
  decipher.setAuthTag(Buffer.from(input.tag, "base64"));

  return Buffer.concat([decipher.update(Buffer.from(input.ciphertext, "base64")), decipher.final()]).toString("utf8");
}
