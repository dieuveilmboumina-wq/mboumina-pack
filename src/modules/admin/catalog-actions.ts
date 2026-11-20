"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { can } from "@/lib/permissions";
import { parseMoney } from "@/lib/money";
import { saveUpload, UploadError } from "@/lib/files";

type State = { error?: string; ok?: string } | undefined;

const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
const optStr = (max: number) => z.string().trim().max(max).optional().transform((v) => v ?? "");
const optInt = z.string().optional().transform((v) => (v && v.trim() !== "" ? Number(v) : null)).refine((v) => v === null || (Number.isInteger(v) && v >= 0), "Nombre entier attendu");

const productSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9\-_.]+$/, "Référence : lettres, chiffres, - _ . uniquement"),
  nameFr: z.string().trim().min(2).max(160), nameEn: optStr(160),
  categoryId: z.string().min(1),
  descCommercialFr: optStr(5000), descCommercialEn: optStr(5000), descTechnicalFr: optStr(5000), descTechnicalEn: optStr(5000),
  materials: optStr(300), dimensions: optStr(200), capacity: optStr(100), colors: optStr(200), finishes: optStr(200),
  weightGrams: optInt, unitsPerPack: optInt, unitsPerCarton: optInt, moq: z.coerce.number().int().min(1).default(1),
  supplierId: z.string().optional(), sourcingMode: z.enum(["stock", "partner_on_order"]),
  leadTimeDays: optInt, shipTimeDays: optInt, originCountry: optStr(60), videoUrl: z.string().url().optional().or(z.literal("")),
  seoTitle: optStr(70), seoDescription: optStr(170),
  isFeatured: z.string().optional(), isNew: z.string().optional(), isEco: z.string().optional(), isCustomizable: z.string().optional(), foodContact: z.string().optional(),
});

export async function saveProduct(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("catalog.edit");
  const p = productSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues.map((i) => `${i.path.join(".")} : ${i.message}`).join(" · ") };
  const f = p.data;
  const data = {
    sku: f.sku.toUpperCase(), nameFr: f.nameFr, nameEn: f.nameEn || f.nameFr, categoryId: f.categoryId,
    descCommercialFr: f.descCommercialFr, descCommercialEn: f.descCommercialEn, descTechnicalFr: f.descTechnicalFr, descTechnicalEn: f.descTechnicalEn,
    materials: f.materials, dimensions: f.dimensions, capacity: f.capacity, colors: f.colors, finishes: f.finishes,
    weightGrams: f.weightGrams, unitsPerPack: f.unitsPerPack, unitsPerCarton: f.unitsPerCarton, moq: f.moq,
    supplierId: f.supplierId || null, sourcingMode: f.sourcingMode, leadTimeDays: f.leadTimeDays, shipTimeDays: f.shipTimeDays,
    originCountry: f.originCountry || null, videoUrl: f.videoUrl || null, seoTitle: f.seoTitle || null, seoDescription: f.seoDescription || null,
    isFeatured: f.isFeatured === "on", isNew: f.isNew === "on", isEco: f.isEco === "on", isCustomizable: f.isCustomizable === "on", foodContact: f.foodContact === "on",
  };
  if (f.sourcingMode === "partner_on_order" && !data.supplierId) return { error: "Le mode « achat partenaire après commande » nécessite un fournisseur." };
  const dup = await db.product.findFirst({ where: { sku: data.sku, NOT: f.id ? { id: f.id } : undefined } });
  if (dup) return { error: "Cette référence existe déjà." };
  let id = f.id;
  if (id) {
    await db.product.update({ where: { id }, data });
    await audit(u.id, "product.update", "Product", id, data);
  } else {
    let slug = slugify(`${f.nameFr}-${data.sku}`);
    if (await db.product.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
    const created = await db.product.create({ data: { ...data, slug, status: "draft", variants: { create: { sku: data.sku, label: "Standard" } } } });
    id = created.id;
    await audit(u.id, "product.create", "Product", id, data);
  }
  revalidatePath("/admin/produits");
  redirect(`/admin/produits/${id}?ok=1`);
}

export async function setProductStatus(fd: FormData) {
  const u = await requireStaff("catalog.edit");
  const id = String(fd.get("id"));
  const status = z.enum(["draft", "active", "archived"]).parse(fd.get("status"));
  await db.product.update({ where: { id }, data: { status } });
  await audit(u.id, "product.status", "Product", id, { status });
  revalidatePath(`/admin/produits/${id}`);
}

const tierRow = z.object({ minQty: z.number().int().min(1), label: z.string().min(1).max(40), price: z.string(), negotiable: z.boolean() });

export async function saveVariant(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("pricing.edit");
  const productId = String(fd.get("productId"));
  const variantId = String(fd.get("variantId") || "");
  const currency = z.enum(["XOF", "XAF", "EUR", "USD"]).parse(fd.get("currency"));
  const label = z.string().trim().min(1).max(80).parse(fd.get("label"));
  const sku = z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9\-_.]+$/).parse(fd.get("sku")).toUpperCase();
  const money = (k: string) => {
    const raw = String(fd.get(k) ?? "").trim();
    if (!raw) return null;
    const v = parseMoney(raw, currency);
    if (v == null) throw new Error(`Montant invalide : ${k}`);
    return v;
  };
  let price, cost, promo;
  try { price = money("price"); cost = money("cost"); promo = money("promoPrice"); } catch (e) { return { error: (e as Error).message }; }
  const date = (k: string) => { const v = String(fd.get(k) ?? ""); return v ? new Date(v) : null; };
  const taxRaw = String(fd.get("taxRate") ?? "").trim();
  const taxRateBp = taxRaw ? Math.round(Number(taxRaw.replace(",", ".")) * 100) : null;
  if (taxRateBp != null && (!Number.isFinite(taxRateBp) || taxRateBp < 0 || taxRateBp > 10000)) return { error: "Taux de taxe invalide." };

  const tiers: z.infer<typeof tierRow>[] = [];
  for (let i = 0; i < 6; i++) {
    const minQty = String(fd.get(`tier_min_${i}`) ?? "").trim();
    if (!minQty) continue;
    const t = tierRow.safeParse({ minQty: Number(minQty), label: String(fd.get(`tier_label_${i}`) ?? "").trim() || `Palier ${i + 1}`, price: String(fd.get(`tier_price_${i}`) ?? "").trim(), negotiable: fd.get(`tier_neg_${i}`) === "on" });
    if (!t.success) return { error: `Palier ${i + 1} invalide.` };
    tiers.push(t.data);
  }
  const mins = tiers.map((t) => t.minQty);
  if (new Set(mins).size !== mins.length) return { error: "Deux paliers ont la même quantité minimale." };
  const tierData: { minQty: number; label: string; unitPriceMinor: number | null; negotiable: boolean }[] = [];
  for (const t of tiers) {
    const v = t.price ? parseMoney(t.price, currency) : null;
    if (t.price && v == null) return { error: `Prix du palier « ${t.label} » invalide.` };
    if (!t.negotiable && v == null) return { error: `Palier « ${t.label} » : indiquez un prix ou cochez « négociable ».` };
    tierData.push({ minQty: t.minQty, label: t.label, unitPriceMinor: t.negotiable ? null : v, negotiable: t.negotiable });
  }
  const dup = await db.productVariant.findFirst({ where: { sku, NOT: variantId ? { id: variantId } : undefined } });
  if (dup) return { error: "SKU de variante déjà utilisé." };

  const data = {
    label, sku, currency, priceMinor: price, purchaseCostMinor: can(u.role, "purchase_cost.view") ? cost : undefined,
    promoPriceMinor: promo, promoStartsAt: date("promoStartsAt"), promoEndsAt: date("promoEndsAt"), taxRateBp, active: fd.get("active") === "on",
  };
  await db.$transaction(async (tx) => {
    const v = variantId
      ? await tx.productVariant.update({ where: { id: variantId }, data })
      : await tx.productVariant.create({ data: { ...data, productId, purchaseCostMinor: cost } });
    await tx.priceTier.deleteMany({ where: { variantId: v.id } });
    if (tierData.length) await tx.priceTier.createMany({ data: tierData.map((t) => ({ ...t, variantId: v.id })) });
  });
  await audit(u.id, variantId ? "variant.update" : "variant.create", "ProductVariant", variantId || sku, { ...data, tiers: tierData });
  revalidatePath(`/admin/produits/${productId}`);
  return { ok: "Variante et tarifs enregistrés." };
}

export async function addProductMedia(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("catalog.edit");
  const productId = String(fd.get("productId"));
  const alt = String(fd.get("alt") ?? "").slice(0, 200);
  try {
    const f = await saveUpload(fd.get("image") as File | null, u.id, ["image/png", "image/jpeg", "image/webp"]);
    if (!f) return { error: "Choisissez une image." };
    const count = await db.productMedia.count({ where: { productId } });
    await db.productMedia.create({ data: { productId, url: `/api/media/${f.id}`, alt, sort: count } });
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/admin/produits/${productId}`);
  return { ok: "Image ajoutée." };
}

export async function addProductDocument(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("catalog.edit");
  const productId = String(fd.get("productId"));
  const p = z.object({ kind: z.enum(["datasheet", "declaration", "certificate", "material", "test_report", "migration"]), title: z.string().min(2).max(160), issuer: z.string().max(160).optional(), country: z.string().max(60).optional(), validUntil: z.string().optional() }).safeParse(Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")));
  if (!p.success) return { error: "Type et titre requis." };
  try {
    const f = await saveUpload(fd.get("file") as File | null, u.id, ["application/pdf", "image/png", "image/jpeg"]);
    if (!f) return { error: "Choisissez un fichier." };
    await db.productDocument.create({ data: { productId, kind: p.data.kind, title: p.data.title, issuer: p.data.issuer || null, country: p.data.country || null, validUntil: p.data.validUntil ? new Date(p.data.validUntil) : null, fileId: f.id } });
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
  await audit(u.id, "document.add", "Product", productId);
  revalidatePath(`/admin/produits/${productId}`);
  return { ok: "Document ajouté (non vérifié, non public)." };
}

/** Vérification d'un document de conformité : trace l'auteur et la date. Seul un document vérifié peut être publié. */
export async function verifyDocument(fd: FormData) {
  const u = await requireStaff("catalog.edit");
  const id = String(fd.get("id"));
  const action = String(fd.get("action"));
  const doc = await db.productDocument.findUniqueOrThrow({ where: { id } });
  if (action === "verify") await db.productDocument.update({ where: { id }, data: { verifiedAt: new Date(), verifiedById: u.id } });
  if (action === "unverify") await db.productDocument.update({ where: { id }, data: { verifiedAt: null, verifiedById: null, isPublic: false } });
  if (action === "publish" && doc.verifiedAt) await db.productDocument.update({ where: { id }, data: { isPublic: true } });
  if (action === "unpublish") await db.productDocument.update({ where: { id }, data: { isPublic: false } });
  await audit(u.id, `document.${action}`, "ProductDocument", id);
  revalidatePath(`/admin/produits/${doc.productId}`);
}

export async function saveCategory(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("catalog.edit");
  const p = z.object({ nameFr: z.string().trim().min(2).max(100), nameEn: z.string().trim().max(100).optional(), descFr: z.string().max(500).optional(), parentId: z.string().optional() }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "Nom requis." };
  const slug = slugify(p.data.nameFr);
  if (await db.category.findUnique({ where: { slug } })) return { error: "Une catégorie porte déjà ce nom." };
  await db.category.create({ data: { slug, nameFr: p.data.nameFr, nameEn: p.data.nameEn || p.data.nameFr, descFr: p.data.descFr, parentId: p.data.parentId || null, sort: 100 } });
  await audit(u.id, "category.create", "Category", slug);
  revalidatePath("/admin/categories");
  return { ok: "Catégorie créée." };
}
