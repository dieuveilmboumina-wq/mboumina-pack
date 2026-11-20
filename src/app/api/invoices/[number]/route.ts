import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatMoney } from "@/lib/money";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Facture imprimable (HTML → "Imprimer / Enregistrer en PDF" depuis le navigateur). */
export async function GET(_: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const u = await currentUser();
  if (!u) return new Response("Connexion requise", { status: 401 });
  const inv = await db.invoice.findUnique({ where: { number }, include: { order: { include: { lines: true } } } });
  if (!inv) return new Response("Introuvable", { status: 404 });
  const o = inv.order;
  const allowed = o.userId === u.id || (u.companyId && o.companyId === u.companyId) || can(u.role, "payments.view");
  if (!allowed) return new Response("Accès refusé", { status: 403 });
  const settings = Object.fromEntries((await db.setting.findMany({ where: { key: { startsWith: "company." } } })).map((s) => [s.key, s.value]));
  const addr = JSON.parse(o.shippingAddress) as Record<string, string>;
  const m = (v: number) => esc(formatMoney(v, o.currency));
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Facture ${esc(inv.number)}</title>
<style>body{font-family:Inter,Segoe UI,Arial,sans-serif;color:#171A18;max-width:800px;margin:40px auto;padding:0 20px}h1{color:#183D30}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#E7D9B8;text-align:left}td,th{padding:8px;border-bottom:1px solid #ddd}.r{text-align:right}.top{display:flex;justify-content:space-between}@media print{button{display:none}}</style></head><body>
<button onclick="print()">Imprimer / PDF</button>
<div class="top"><div><img src="/brand/logo-horizontal.svg" alt="MBOUMINA PACK" width="260"><p>${esc(settings["company.legal"] ?? "[Mentions légales : NINEA, RCCM, adresse — à configurer dans Paramètres]")}</p></div>
<div><h1>${inv.kind === "credit_note" ? "Avoir" : "Facture"}</h1><p>N° ${esc(inv.number)}<br>Date : ${inv.issuedAt.toLocaleDateString("fr-FR")}<br>Commande : ${esc(o.number)}${o.poReference ? `<br>Bon de commande : ${esc(o.poReference)}` : ""}</p></div></div>
<p><strong>Client :</strong><br>${esc(addr.fullName ?? "")}<br>${esc(addr.line1 ?? "")}<br>${esc(addr.city ?? "")} — ${esc(addr.country ?? "")}<br>${esc(o.email)}</p>
<table><thead><tr><th>Désignation</th><th>Réf.</th><th class="r">Qté</th><th class="r">P.U.</th><th class="r">Total</th></tr></thead><tbody>
${o.lines.map((l) => `<tr><td>${esc(l.name)}</td><td>${esc(l.sku)}</td><td class="r">${l.qty}</td><td class="r">${m(l.unitPriceMinor)}</td><td class="r">${m(l.lineTotalMinor)}</td></tr>`).join("")}
</tbody><tfoot>
<tr><td colspan="4">Sous-total</td><td class="r">${m(o.subtotalMinor)}</td></tr>
${o.discountMinor ? `<tr><td colspan="4">Remise</td><td class="r">− ${m(o.discountMinor)}</td></tr>` : ""}
<tr><td colspan="4">Livraison</td><td class="r">${m(o.shippingMinor)}</td></tr>
<tr><td colspan="4">Taxes</td><td class="r">${m(o.taxMinor)}</td></tr>
<tr><th colspan="4">Total</th><th class="r">${m(o.totalMinor)}</th></tr>
<tr><td colspan="4">Payé</td><td class="r">${m(o.paidMinor)}</td></tr>
</tfoot></table>
<p style="margin-top:40px;font-size:12px">MBOUMINA PACK — Votre partenaire en solutions d'emballage alimentaire.</p>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'" } });
}
