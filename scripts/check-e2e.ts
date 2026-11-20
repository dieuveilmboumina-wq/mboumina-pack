// Script de vérification ponctuelle (tests bout en bout) — lecture seule.
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const stock = await db.stockLevel.findMany({ include: { variant: { select: { sku: true } }, warehouse: { select: { code: true } } } });
  console.log("STOCK", stock.map((s) => ({ sku: s.variant.sku, wh: s.warehouse.code, onHand: s.onHand, reserved: s.reserved, blocked: s.blocked, avgCost: s.avgCostMinor })));
  console.log("ORDERS", await db.order.findMany({ select: { number: true, status: true, totalMinor: true, paidMinor: true } }));
  console.log("PAYMENTS", await db.payment.findMany({ select: { provider: true, kind: true, status: true, amountMinor: true, verifiedAt: true, verifiedBy: true } }));
  console.log("INVOICES", await db.invoice.findMany({ select: { number: true, totalMinor: true } }));
  console.log("MOVES", await db.stockMovement.findMany({ orderBy: { createdAt: "asc" }, select: { type: true, qty: true, unitCostMinor: true, lot: true, note: true, refType: true } }));
  console.log("QUOTES", await db.quote.findMany({ select: { number: true, status: true, totalMinor: true } }));
  console.log("POS", await db.purchaseOrder.findMany({ select: { number: true, status: true } }));
  console.log("AUDIT", (await db.auditLog.findMany({ orderBy: { createdAt: "asc" }, select: { action: true, entity: true, data: true } })).map((a) => `${a.action} ${a.entity} ${a.data ?? ""}`));
}
main().finally(() => db.$disconnect());
