import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { isStaff } from "@/lib/permissions";

/**
 * Téléchargement de fichier avec contrôle d'accès :
 * - document produit public ET vérifié : accessible à tous ;
 * - sinon : personnel habilité ou propriétaire du fichier.
 * Toujours servi en pièce jointe (Content-Disposition: attachment) avec nosniff.
 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = await db.uploadedFile.findUnique({ where: { id } });
  if (!file) return new Response("Introuvable", { status: 404 });
  const publicDoc = await db.productDocument.findFirst({ where: { fileId: id, isPublic: true, verifiedAt: { not: null } } });
  if (!publicDoc) {
    const u = await currentUser();
    if (!u || (!isStaff(u.role) && file.ownerId !== u.id)) return new Response("Accès refusé", { status: 403 });
  }
  const dir = path.resolve(process.env.UPLOAD_DIR ?? "./storage/uploads");
  const full = path.join(dir, path.basename(file.storedPath));
  const data = await readFile(full);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
      "Cache-Control": "private, max-age=0",
    },
  });
}
