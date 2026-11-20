import { NextResponse, type NextRequest } from "next/server";

/**
 * Mode « aperçu privé » : actif uniquement si PREVIEW_PASSWORD est défini (production avant ouverture au public).
 * - tout le site demande un identifiant (PREVIEW_USER, « mboumina » par défaut) et le mot de passe d'aperçu ;
 * - aucune page n'est indexable (en-tête X-Robots-Tag) ;
 * - les futurs webhooks de paiement (/api/webhooks/…) restent joignables : ils sont authentifiés par signature.
 * Pour ouvrir le site au public : supprimer PREVIEW_PASSWORD dans Render, puis redéployer.
 */
export function middleware(req: NextRequest) {
  const password = process.env.PREVIEW_PASSWORD;
  if (!password) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/webhooks/") || req.nextUrl.pathname === "/api/health") return NextResponse.next();

  const user = process.env.PREVIEW_USER || "mboumina";
  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    let decoded = "";
    try { decoded = atob(header.slice(6)); } catch { /* en-tête invalide */ }
    const sep = decoded.indexOf(":");
    if (sep > 0 && safeEqual(decoded.slice(0, sep), user) && safeEqual(decoded.slice(sep + 1), password)) {
      const res = NextResponse.next();
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      return res;
    }
  }
  return new NextResponse("Site en préparation — accès réservé.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="MBOUMINA PACK - apercu prive", charset="UTF-8"', "X-Robots-Tag": "noindex, nofollow", "Content-Type": "text/plain; charset=utf-8" },
  });
}

/** Comparaison en temps constant (évite de révéler le mot de passe caractère par caractère). */
function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export const config = {
  // Tout sauf les fichiers techniques de Next.js.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
