"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { audit, nextNumber } from "@/lib/audit";
import { convert, parseMoney } from "@/lib/money";
import { landedUnitCost, weightedAverageCost } from "@/modules/pricing/engine";
import type { Prisma } from "@prisma/client";

type State = { error?: string; ok?: string } | undefined;
const fdObj = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string"));

// ───── Entrepôts ─────
export async function saveWarehouse(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("stock.edit");
  const p = z.object({ code: z.string().trim().min(2).max(12).regex(/^[A-Z0-9-]+$/i), name: z.string().trim().min(2).max(100), country: z.string().length(2), city: z.string().trim().min(2).max(100) }).safeParse(fdObj(fd));
  if (!p.success) return { error: "Code (lettres/chiffres), nom, pays et ville requis." };
  if (await db.warehouse.findUnique({ where: { code: p.data.code.toUpperCase() } })) return { error: "Code déjà utilisé." };
  const w = await db.warehouse.create({ data: { ...p.data, code: p.data.code.toUpperCase() } });
  await audit(u.id, "warehouse.create", "Warehouse", w.id, p.data);
  revalidatePath("/admin/stocks");
  return { ok: "Entrepôt créé." };
}

// ───── Mouvements de stock ─────
async function applyMovement(tx: Prisma.TransactionClient, a: { variantId: string; warehouseId: string; type: string; qty: number; unitCostMinor?: number | null; lot?: string | null; note?: string | null; userId: string; refType?: string; refId?: string }) {
  const lvl = await tx.stockLevel.upsert({ where: { variantId_warehouseId: { variantId: a.variantId, warehouseId: a.warehouseId } }, create: { variantId: a.variantId, warehouseId: a.warehouseId }, update: {} });
  if (lvl.onHand + a.qty < lvl.reserved + lvl.blocked && a.qty < 0) throw new Error("Sortie impossible : la quantité restante serait inférieure aux réservations.");
  if (lvl.onHand + a.qty < 0) throw new Error("Stock insuffisant.");
  const avg = a.qty > 0 && a.unitCostMinor != null ? weightedAverageCost(lvl.onHand, lvl.avgCostMinor, a.qty, a.unitCostMinor) : lvl.avgCostMinor;
  await tx.stockLevel.update({ where: { variantId_warehouseId: { variantId: a.variantId, warehouseId: a.warehouseId } }, data: { onHand: { increment: a.qty }, avgCostMinor: avg } });
  await tx.stockMovement.create({ data: { variantId: a.variantId, warehouseId: a.warehouseId, type: a.type, qty: a.qty, unitCostMinor: a.unitCostMinor ?? null, lot: a.lot || null, note: a.note || null, userId: a.userId, refType: a.refType, refId: a.refId } });
}

export async function stockMovement(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("stock.edit");
  const p = z.object({
    variantId: z.string().min(1), warehouseId: z.string().min(1), type: z.enum(["adjustment_in", "adjustment_out", "transfer", "block", "unblock", "return"]),
    qty: z.coerce.number().int().min(1).max(10_000_000), toWarehouseId: z.string().optional(), lot: z.string().max(60).optional(), note: z.string().trim().min(3, "Motif obligatoire").max(300),
  }).safeParse(fdObj(fd));
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Champs invalides." };
  const f = p.data;
  try {
    await db.$transaction(async (tx) => {
      if (f.type === "adjustment_in" || f.type === "return") await applyMovement(tx, { ...f, type: f.type === "return" ? "return" : "adjustment", qty: f.qty, userId: u.id });
      else if (f.type === "adjustment_out") await applyMovement(tx, { ...f, type: "adjustment", qty: -f.qty, userId: u.id });
      else if (f.type === "transfer") {
        if (!f.toWarehouseId || f.toWarehouseId === f.warehouseId) throw new Error("Entrepôt de destination invalide.");
        const src = await tx.stockLevel.findUnique({ where: { variantId_warehouseId: { variantId: f.variantId, warehouseId: f.warehouseId } } });
        await applyMovement(tx, { ...f, type: "transfer_out", qty: -f.qty, userId: u.id });
        await applyMovement(tx, { ...f, warehouseId: f.toWarehouseId, type: "transfer_in", qty: f.qty, unitCostMinor: src?.avgCostMinor, userId: u.id });
      } else {
        const lvl = await tx.stockLevel.findUnique({ where: { variantId_warehouseId: { variantId: f.variantId, warehouseId: f.warehouseId } } });
        if (!lvl) throw new Error("Aucun stock pour cet article dans cet entrepôt.");
        const delta = f.type === "block" ? f.qty : -f.qty;
        if (lvl.blocked + delta < 0 || (delta > 0 && lvl.onHand - lvl.reserved - lvl.blocked < delta)) throw new Error("Quantité incohérente.");
        await tx.stockLevel.update({ where: { variantId_warehouseId: { variantId: f.variantId, warehouseId: f.warehouseId } }, data: { blocked: { increment: delta } } });
        await tx.stockMovement.create({ data: { variantId: f.variantId, warehouseId: f.warehouseId, type: f.type, qty: 0, note: `${f.note} (${f.qty})`, userId: u.id } });
      }
    });
  } catch (e) {
    return { error: (e as Error).message };
  }
  await audit(u.id, `stock.${f.type}`, "ProductVariant", f.variantId, f);
  revalidatePath("/admin/stocks");
  return { ok: "Mouvement enregistré." };
}

export async function setStockThresholds(fd: FormData) {
  await requireStaff("stock.edit");
  const variantId = String(fd.get("variantId")), warehouseId = String(fd.get("warehouseId"));
  const n = (k: string) => { const v = String(fd.get(k) ?? "").trim(); return v ? Math.max(0, Math.floor(Number(v))) : null; };
  await db.stockLevel.upsert({ where: { variantId_warehouseId: { variantId, warehouseId } }, create: { variantId, warehouseId, minLevel: n("minLevel"), maxLevel: n("maxLevel") }, update: { minLevel: n("minLevel"), maxLevel: n("maxLevel") } });
  revalidatePath("/admin/stocks");
}

// ───── Fournisseurs ─────
export async function saveSupplier(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("suppliers.edit");
  const p = z.object({
    id: z.string().optional(), name: z.string().trim().min(2).max(160), kind: z.enum(["supplier", "printer_partner", "carrier_partner"]),
    country: z.string().max(60).optional(), contactName: z.string().max(120).optional(), email: z.string().email().optional().or(z.literal("")), phone: z.string().max(30).optional(),
    paymentTermsDays: z.string().optional(), rating: z.string().optional(), notes: z.string().max(2000).optional(),
  }).safeParse(fdObj(fd));
  if (!p.success) return { error: "Nom et type requis ; email valide." };
  const { id, paymentTermsDays, rating, ...rest } = p.data;
  const data = { ...rest, email: rest.email || null, paymentTermsDays: paymentTermsDays ? Number(paymentTermsDays) : null, rating: rating ? Math.min(5, Math.max(1, Number(rating))) : null };
  const s = id ? await db.supplier.update({ where: { id }, data }) : await db.supplier.create({ data });
  await audit(u.id, id ? "supplier.update" : "supplier.create", "Supplier", s.id, data);
  revalidatePath("/admin/fournisseurs");
  return { ok: "Fournisseur enregistré." };
}

/** Prix fournisseur (demande de prix reçue / catalogue fournisseur) — base de la comparaison. */
export async function saveSupplierPrice(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("suppliers.edit");
  const p = z.object({ supplierId: z.string(), variantId: z.string(), currency: z.enum(["XOF", "XAF", "EUR", "USD"]), cost: z.string(), moq: z.string().optional(), leadTimeDays: z.string().optional(), supplierSku: z.string().max(60).optional() }).safeParse(fdObj(fd));
  if (!p.success) return { error: "Champs invalides." };
  const cost = parseMoney(p.data.cost, p.data.currency);
  if (cost == null) return { error: "Prix invalide." };
  const data = { costMinor: cost, currency: p.data.currency, moq: p.data.moq ? Number(p.data.moq) : null, leadTimeDays: p.data.leadTimeDays ? Number(p.data.leadTimeDays) : null, supplierSku: p.data.supplierSku || null, quotedAt: new Date() };
  await db.supplierProduct.upsert({ where: { supplierId_variantId: { supplierId: p.data.supplierId, variantId: p.data.variantId } }, create: { ...data, supplierId: p.data.supplierId, variantId: p.data.variantId }, update: data });
  await audit(u.id, "supplier.price", "Supplier", p.data.supplierId, data);
  revalidatePath("/admin/fournisseurs");
  return { ok: "Prix fournisseur enregistré." };
}

// ───── Achats (commandes fournisseurs) ─────
export async function createPurchaseOrder(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("purchases.edit");
  const p = z.object({ supplierId: z.string().min(1), warehouseId: z.string().min(1), currency: z.enum(["XOF", "XAF", "EUR", "USD"]), expectedAt: z.string().optional(), notes: z.string().max(2000).optional(), freight: z.string().optional(), duties: z.string().optional(), other: z.string().optional() }).safeParse(fdObj(fd));
  if (!p.success) return { error: "Fournisseur, entrepôt et devise requis." };
  const f = p.data;
  const lines: { variantId: string; qty: number; unitCostMinor: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const variantId = String(fd.get(`line_variant_${i}`) ?? "");
    const qty = Number(fd.get(`line_qty_${i}`) ?? 0);
    const cost = parseMoney(String(fd.get(`line_cost_${i}`) ?? ""), f.currency);
    if (!variantId) continue;
    if (!Number.isInteger(qty) || qty < 1 || cost == null) return { error: `Ligne ${i + 1} : quantité et prix unitaire requis.` };
    lines.push({ variantId, qty, unitCostMinor: cost });
  }
  if (lines.length === 0) return { error: "Ajoutez au moins une ligne." };
  const money = (v?: string) => (v ? parseMoney(v, f.currency) ?? 0 : 0);
  const number = await nextNumber("ACH");
  const po = await db.purchaseOrder.create({
    data: { number, supplierId: f.supplierId, warehouseId: f.warehouseId, currency: f.currency, status: "pending_approval", expectedAt: f.expectedAt ? new Date(f.expectedAt) : null, notes: f.notes, freightMinor: money(f.freight), dutiesMinor: money(f.duties), otherCostsMinor: money(f.other), createdById: u.id, lines: { create: lines } },
  });
  await audit(u.id, "po.create", "PurchaseOrder", po.id, { number });
  redirect(`/admin/achats/${po.id}`);
}

export async function poTransition(fd: FormData) {
  const id = String(fd.get("id"));
  const to = z.enum(["approved", "sent", "cancelled"]).parse(fd.get("to"));
  const u = await requireStaff(to === "approved" ? "purchases.approve" : "purchases.edit");
  const po = await db.purchaseOrder.findUniqueOrThrow({ where: { id } });
  const allowed: Record<string, string[]> = { pending_approval: ["approved", "cancelled"], approved: ["sent", "cancelled"], sent: ["cancelled"] };
  if (!allowed[po.status]?.includes(to)) throw new Error("Transition interdite");
  if (to === "approved" && po.createdById === u.id && u.role !== "founder") throw new Error("Validation hiérarchique : un achat doit être validé par une autre personne que son créateur.");
  await db.purchaseOrder.update({ where: { id }, data: { status: to, ...(to === "approved" ? { approvedById: u.id, approvedAt: new Date() } : {}) } });
  await audit(u.id, `po.${to}`, "PurchaseOrder", id);
  revalidatePath(`/admin/achats/${id}`);
}

/** Dernier taux enregistré (avec source et date) entre deux devises ; inverse le taux si seul le sens opposé existe. */
async function latestRate(tx: Prisma.TransactionClient, from: string, to: string): Promise<string | null> {
  const direct = await tx.exchangeRate.findFirst({ where: { base: from, quote: to }, orderBy: { fetchedAt: "desc" } });
  if (direct) return direct.rate;
  const inverse = await tx.exchangeRate.findFirst({ where: { base: to, quote: from }, orderBy: { fetchedAt: "desc" } });
  return inverse ? String(1 / Number(inverse.rate)) : null;
}

/** Réception avec contrôle : quantités acceptées/refusées, lot, observations. Met à jour stock, CMP et coût d'achat. */
export async function receivePurchaseOrder(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("stock.edit");
  const id = String(fd.get("poId"));
  const po = await db.purchaseOrder.findUniqueOrThrow({ where: { id }, include: { lines: true } });
  if (!["sent", "approved", "partially_received"].includes(po.status)) return { error: "Cet achat n'est pas en attente de réception." };
  const rec: { lineId: string; variantId: string; accepted: number; rejected: number; lot: string | null; nc: string | null; unitCostMinor: number }[] = [];
  for (const l of po.lines) {
    const accepted = Number(fd.get(`acc_${l.id}`) || 0), rejected = Number(fd.get(`rej_${l.id}`) || 0);
    if (!Number.isInteger(accepted) || !Number.isInteger(rejected) || accepted < 0 || rejected < 0) return { error: "Quantités invalides." };
    if (accepted + rejected + l.receivedQty + l.rejectedQty > l.qty) return { error: "Quantité reçue supérieure à la quantité commandée — enregistrer un litige." };
    if (accepted + rejected > 0) rec.push({ lineId: l.id, variantId: l.variantId, accepted, rejected, lot: String(fd.get(`lot_${l.id}`) || "") || null, nc: String(fd.get(`nc_${l.id}`) || "") || null, unitCostMinor: l.unitCostMinor });
  }
  if (rec.length === 0) return { error: "Aucune quantité saisie." };
  const landed = landedUnitCost(po.lines.map((l) => ({ qty: l.qty, unitCostMinor: l.unitCostMinor })), po.freightMinor + po.dutiesMinor + po.otherCostsMinor);
  const checklist = JSON.stringify({ packagingOk: fd.get("chk_packaging") === "on", labelsOk: fd.get("chk_labels") === "on", docsOk: fd.get("chk_docs") === "on", notes: String(fd.get("notes") ?? "").slice(0, 1000) });
  try {
    await db.$transaction(async (tx) => {
      const receipt = await tx.goodsReceipt.create({ data: { poId: id, userId: u.id, notes: String(fd.get("notes") ?? "") || null } });
      for (const r of rec) {
        let cost = landed[po.lines.findIndex((l) => l.id === r.lineId)];
        // Le coût d'achat et le CMP sont tenus dans la devise de vente de la variante : conversion au taux enregistré.
        const variant = await tx.productVariant.findUniqueOrThrow({ where: { id: r.variantId }, select: { currency: true, sku: true } });
        if (variant.currency !== po.currency) {
          const rate = await latestRate(tx, po.currency, variant.currency);
          if (!rate) throw new Error(`Aucun taux de change ${po.currency} → ${variant.currency} enregistré (article ${variant.sku}). Saisissez un taux daté avant la réception.`);
          cost = convert(cost, po.currency, variant.currency, rate);
        }
        await tx.goodsReceiptLine.create({ data: { receiptId: receipt.id, poLineId: r.lineId, acceptedQty: r.accepted, rejectedQty: r.rejected, lot: r.lot, inspection: checklist, nonConformity: r.nc } });
        await tx.purchaseOrderLine.update({ where: { id: r.lineId }, data: { receivedQty: { increment: r.accepted }, rejectedQty: { increment: r.rejected } } });
        if (r.accepted > 0) {
          await applyMovement(tx, { variantId: r.variantId, warehouseId: po.warehouseId, type: "receipt", qty: r.accepted, unitCostMinor: cost, lot: r.lot, userId: u.id, refType: "po", refId: id });
          await tx.productVariant.update({ where: { id: r.variantId }, data: { purchaseCostMinor: cost } });
        }
      }
      const lines = await tx.purchaseOrderLine.findMany({ where: { poId: id } });
      const complete = lines.every((l) => l.receivedQty + l.rejectedQty >= l.qty);
      await tx.purchaseOrder.update({ where: { id }, data: { status: complete ? "received" : "partially_received" } });
    });
  } catch (e) {
    return { error: (e as Error).message };
  }
  await audit(u.id, "po.receive", "PurchaseOrder", id, rec);
  revalidatePath(`/admin/achats/${id}`);
  return { ok: "Réception enregistrée, stock et coût moyen pondéré mis à jour." };
}
