import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "./db";

const MAX_BYTES = 10 * 1024 * 1024;

/** Types autorisés, vérifiés par signature binaire (magic bytes) et non par l'extension déclarée. */
const SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: "application/pdf", ext: "pdf", test: (b) => b.subarray(0, 5).toString() === "%PDF-" },
  { mime: "image/png", ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/webp", ext: "webp", test: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
  { mime: "image/svg+xml", ext: "svg", test: (b) => /^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(b.subarray(0, 2000).toString("utf8")) },
];

export class UploadError extends Error {}

/**
 * Enregistre un fichier envoyé par un utilisateur.
 * - taille limitée, type vérifié par signature ;
 * - nom de stockage aléatoire (aucun nom fourni par l'utilisateur dans le chemin) ;
 * - les SVG sont servis en téléchargement uniquement (jamais rendus inline) pour éviter le XSS ;
 * - scanStatus "pending" : brancher un antivirus (ex. ClamAV) en production.
 */
export async function saveUpload(file: File | null, ownerId: string | null, allowed: string[] = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/svg+xml"]) {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_BYTES) throw new UploadError("Fichier trop volumineux (10 Mo maximum).");
  const buf = Buffer.from(await file.arrayBuffer());
  const sig = SIGNATURES.find((s) => allowed.includes(s.mime) && s.test(buf));
  if (!sig) throw new UploadError("Format non accepté. Formats autorisés : PDF, PNG, JPG, WEBP, SVG.");
  const dir = path.resolve(process.env.UPLOAD_DIR ?? "./storage/uploads");
  await mkdir(dir, { recursive: true });
  const stored = `${randomUUID()}.${sig.ext}`;
  await writeFile(path.join(dir, stored), buf, { flag: "wx" });
  return db.uploadedFile.create({
    data: {
      ownerId, originalName: file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120), storedPath: stored, mime: sig.mime,
      size: buf.length, sha256: createHash("sha256").update(buf).digest("hex"),
    },
  });
}
