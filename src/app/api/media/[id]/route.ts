import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";

/** Images produits publiques (PNG/JPG/WEBP uniquement — les SVG ne sont jamais servis inline). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const media = await db.productMedia.findFirst({ where: { url: `/api/media/${id}` } });
  const file = media ? await db.uploadedFile.findUnique({ where: { id } }) : null;
  if (!file || !["image/png", "image/jpeg", "image/webp"].includes(file.mime)) return new Response("Introuvable", { status: 404 });
  const data = await readFile(path.join(path.resolve(process.env.UPLOAD_DIR ?? "./storage/uploads"), path.basename(file.storedPath)));
  return new Response(new Uint8Array(data), { headers: { "Content-Type": file.mime, "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=86400" } });
}
