import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Contrôle de santé pour l'hébergeur : vérifie que l'application répond et que la base est joignable. Ne renvoie aucune donnée. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
