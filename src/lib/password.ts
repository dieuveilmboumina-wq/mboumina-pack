import { scrypt, randomBytes, timingSafeEqual, createHash } from "node:crypto";

const N = 16384, r = 8, p = 1, KEYLEN = 64;

function scryptAsync(pw: string, salt: Buffer): Promise<Buffer> {
  return new Promise((res, rej) => scrypt(pw, salt, KEYLEN, { N, r, p }, (e, k) => (e ? rej(e) : res(k))));
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(pw, salt);
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[4], "base64");
  const expected = Buffer.from(parts[5], "base64");
  const key = await scryptAsync(pw, salt);
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Règle : 10 caractères minimum, au moins une lettre et un chiffre. */
export function passwordPolicyError(pw: string): string | null {
  if (pw.length < 10) return "Le mot de passe doit contenir au moins 10 caractères.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Le mot de passe doit contenir au moins une lettre et un chiffre.";
  return null;
}

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
