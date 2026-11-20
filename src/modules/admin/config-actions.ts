"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { parseMoney } from "@/lib/money";
import { hashPassword, passwordPolicyError } from "@/lib/password";
import { ROLES } from "@/lib/constants";

type State = { error?: string; ok?: string } | undefined;
const obj = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;

// ───── Paramètres ─────
const SETTING_KEYS = ["company.legal", "contact.phone", "contact.whatsapp", "contact.email", "contact.address", "contact.hours", "payment.bank_details", "home.banner", "jobs.open_positions"];
export async function saveSettings(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("settings.edit");
  const f = obj(fd);
  for (const key of SETTING_KEYS) {
    const value = (f[key] ?? "").slice(0, 4000);
    await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
  await audit(u.id, "settings.update", "Setting", null, Object.fromEntries(SETTING_KEYS.map((k) => [k, k === "payment.bank_details" ? "(modifié)" : f[k]])));
  revalidatePath("/", "layout");
  return { ok: "Paramètres enregistrés." };
}

// ───── Livraison ─────
export async function saveCarrier(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("logistics.edit");
  const p = z.object({ name: z.string().trim().min(2).max(100), trackingUrlTemplate: z.string().max(300).optional(), contractRef: z.string().max(100).optional() }).safeParse(obj(fd));
  if (!p.success) return { error: "Nom requis." };
  if (p.data.trackingUrlTemplate && !/^https:\/\/.+\{tracking\}/.test(p.data.trackingUrlTemplate)) return { error: "L'URL de suivi doit commencer par https:// et contenir {tracking}." };
  const c = await db.carrier.create({ data: { name: p.data.name, trackingUrlTemplate: p.data.trackingUrlTemplate || null, contractRef: p.data.contractRef || null } });
  await audit(u.id, "carrier.create", "Carrier", c.id);
  revalidatePath("/admin/livraison");
  return { ok: "Transporteur ajouté." };
}

export async function saveZone(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("logistics.edit");
  const p = z.object({ name: z.string().trim().min(2).max(100), countries: z.string().trim().regex(/^[A-Za-z]{2}(\s*,\s*[A-Za-z]{2})*$/, "Codes pays ISO séparés par des virgules (ex. SN, CI)"), cities: z.string().max(1000).optional() }).safeParse(obj(fd));
  if (!p.success) return { error: p.error.issues[0]?.message };
  const z0 = await db.shippingZone.create({ data: { name: p.data.name, countries: p.data.countries.toUpperCase().replace(/\s/g, ""), cities: p.data.cities || null, active: false } });
  await audit(u.id, "zone.create", "ShippingZone", z0.id);
  revalidatePath("/admin/livraison");
  return { ok: "Zone créée (inactive). Ajoutez un tarif puis activez-la." };
}

export async function saveRate(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("logistics.edit");
  const f = obj(fd);
  const p = z.object({ zoneId: z.string(), carrierId: z.string(), service: z.enum(["standard", "express", "international", "pickup"]), currency: z.enum(["XOF", "XAF", "EUR", "USD"]), minDays: z.coerce.number().int().min(0), maxDays: z.coerce.number().int().min(0) }).safeParse(f);
  if (!p.success || p.data.maxDays < p.data.minDays) return { error: "Champs invalides (délai max ≥ délai min)." };
  const base = parseMoney(f.base ?? "", p.data.currency);
  const perKg = f.perKg ? parseMoney(f.perKg, p.data.currency) : 0;
  const freeAbove = f.freeAbove ? parseMoney(f.freeAbove, p.data.currency) : null;
  if (base == null || perKg == null || (f.freeAbove && freeAbove == null)) return { error: "Montants invalides." };
  const r = await db.shippingRate.create({ data: { ...p.data, baseMinor: base, perKgMinor: perKg, freeAboveMinor: freeAbove } });
  await audit(u.id, "rate.create", "ShippingRate", r.id);
  revalidatePath("/admin/livraison");
  return { ok: "Tarif ajouté." };
}

export async function toggleZone(fd: FormData) {
  const u = await requireStaff("logistics.edit");
  const id = String(fd.get("id"));
  const z0 = await db.shippingZone.findUniqueOrThrow({ where: { id }, include: { rates: true } });
  if (!z0.active && z0.rates.length === 0) throw new Error("Ajoutez au moins un tarif avant d'activer la zone.");
  await db.shippingZone.update({ where: { id }, data: { active: !z0.active } });
  await audit(u.id, z0.active ? "zone.deactivate" : "zone.activate", "ShippingZone", id);
  revalidatePath("/admin/livraison");
}

/** Activation de la vente pour un pays : confirmation explicite que la couverture transporteur est vérifiée. */
export async function saveCountry(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("settings.edit");
  const f = obj(fd);
  const code = z.string().length(2).parse(f.code);
  const taxRateBp = f.taxRate ? Math.round(Number(f.taxRate.replace(",", ".")) * 100) : null;
  if (taxRateBp != null && (!Number.isFinite(taxRateBp) || taxRateBp < 0 || taxRateBp > 10000)) return { error: "Taux invalide." };
  const selling = f.sellingEnabled === "on";
  if (selling && f.coverageVerified !== "on") return { error: "Cochez la confirmation de vérification de la couverture transporteur pour ouvrir la vente." };
  await db.country.update({ where: { code }, data: { taxRateBp, taxLabel: f.taxLabel || null, sellingEnabled: selling } });
  await audit(u.id, "country.update", "Country", code, { taxRateBp, selling });
  revalidatePath("/admin/livraison");
  return { ok: `${code} mis à jour.` };
}

// ───── Clients / entreprises ─────
export async function updateCompany(_: State, fd: FormData): Promise<State> {
  const f = obj(fd);
  const u = await requireStaff("customers.edit");
  const id = f.id;
  const c = await db.company.findUniqueOrThrow({ where: { id } });
  const data: Record<string, unknown> = {};
  if (f.status && f.status !== c.status) {
    await requireStaff("companies.verify");
    data.status = f.status;
    if (f.status === "verified") { data.verifiedAt = new Date(); data.verifiedById = u.id; }
  }
  const thr = f.approvalThreshold ? parseMoney(f.approvalThreshold, "XOF") : null;
  data.approvalThreshold = thr;
  data.salesRepId = f.salesRepId || null;
  const credit = f.creditLimit ? parseMoney(f.creditLimit, "XOF") : null;
  if (credit !== c.creditLimit || (f.paymentTermsDays ? Number(f.paymentTermsDays) : null) !== c.paymentTermsDays) {
    await requireStaff("credit.authorize"); // crédit et délais de paiement : fondateur uniquement
    data.creditLimit = credit;
    data.paymentTermsDays = f.paymentTermsDays ? Number(f.paymentTermsDays) : null;
  }
  await db.company.update({ where: { id }, data });
  await audit(u.id, "company.update", "Company", id, data);
  revalidatePath("/admin/clients");
  return { ok: "Entreprise mise à jour." };
}

export async function setNegotiatedPrice(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("pricing.edit");
  const f = obj(fd);
  const currency = z.enum(["XOF", "XAF", "EUR", "USD"]).parse(f.currency);
  const price = parseMoney(f.price ?? "", currency);
  if (!f.companyId || !f.variantId || price == null) return { error: "Entreprise, article et prix requis." };
  await db.negotiatedPrice.upsert({ where: { companyId_variantId: { companyId: f.companyId, variantId: f.variantId } }, create: { companyId: f.companyId, variantId: f.variantId, unitPriceMinor: price, currency, validUntil: f.validUntil ? new Date(f.validUntil) : null }, update: { unitPriceMinor: price, currency, validUntil: f.validUntil ? new Date(f.validUntil) : null } });
  await audit(u.id, "price.negotiated", "Company", f.companyId, { variantId: f.variantId, price });
  revalidatePath("/admin/clients");
  return { ok: "Tarif négocié enregistré." };
}

// ───── Utilisateurs internes ─────
export async function createStaff(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("users.manage");
  const f = obj(fd);
  const p = z.object({ name: z.string().trim().min(2), email: z.string().trim().toLowerCase().email(), role: z.enum(ROLES), password: z.string() }).safeParse(f);
  if (!p.success) return { error: "Nom, email, rôle et mot de passe initial requis." };
  if (p.data.role === "founder") return { error: "Le rôle fondateur ne peut pas être attribué." };
  if (p.data.role === "admin" && u.role !== "founder") return { error: "Seul le fondateur peut créer un administrateur." };
  const err = passwordPolicyError(p.data.password);
  if (err) return { error: err };
  if (await db.user.findUnique({ where: { email: p.data.email } })) return { error: "Email déjà utilisé." };
  const created = await db.user.create({ data: { name: p.data.name, email: p.data.email, role: p.data.role, passwordHash: await hashPassword(p.data.password) } });
  await audit(u.id, "user.create_staff", "User", created.id, { role: p.data.role });
  revalidatePath("/admin/utilisateurs");
  return { ok: "Compte créé. Communiquez le mot de passe initial par un canal sûr et demandez sa modification." };
}

export async function changeRole(fd: FormData) {
  const u = await requireStaff("roles.manage");
  const id = String(fd.get("id"));
  const role = z.enum(ROLES).parse(fd.get("role"));
  const target = await db.user.findUniqueOrThrow({ where: { id } });
  if (target.role === "founder" || role === "founder") throw new Error("Le rôle fondateur est protégé.");
  await db.user.update({ where: { id }, data: { role } });
  await db.session.deleteMany({ where: { userId: id } });
  await audit(u.id, "user.role", "User", id, { from: target.role, to: role });
  revalidatePath("/admin/utilisateurs");
}

export async function toggleUser(fd: FormData) {
  const u = await requireStaff("users.manage");
  const id = String(fd.get("id"));
  const target = await db.user.findUniqueOrThrow({ where: { id } });
  if (target.role === "founder" || target.id === u.id) throw new Error("Action interdite sur ce compte.");
  await db.user.update({ where: { id }, data: { disabledAt: target.disabledAt ? null : new Date() } });
  if (!target.disabledAt) await db.session.deleteMany({ where: { userId: id } });
  await audit(u.id, target.disabledAt ? "user.enable" : "user.disable", "User", id);
  revalidatePath("/admin/utilisateurs");
}

// ───── Registre ─────
export async function setFeatureStatus(fd: FormData) {
  const u = await requireStaff("features.edit");
  const code = Number(fd.get("code"));
  const status = z.enum(["todo", "in_progress", "done", "blocked"]).parse(fd.get("status"));
  const notes = String(fd.get("notes") ?? "").slice(0, 500) || null;
  await db.feature.update({ where: { code }, data: { status, notes, verifiedAt: status === "done" ? new Date() : null } });
  await audit(u.id, "feature.status", "Feature", String(code), { status });
  revalidatePath("/admin/registre");
}

// ───── Marketing ─────
export async function saveCoupon(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("marketing.edit");
  const f = obj(fd);
  const p = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,30}$/), kind: z.enum(["percent", "fixed"]) }).safeParse(f);
  if (!p.success) return { error: "Code (3-30 lettres/chiffres) et type requis." };
  let value: number | null;
  if (p.data.kind === "percent") { const n = Number(f.value?.replace(",", ".")); value = Number.isFinite(n) && n > 0 && n <= 100 ? Math.round(n * 100) : null; }
  else value = parseMoney(f.value ?? "", f.currency || "XOF");
  if (value == null) return { error: "Valeur invalide." };
  if (await db.coupon.findUnique({ where: { code: p.data.code } })) return { error: "Code existant." };
  await db.coupon.create({ data: { code: p.data.code, kind: p.data.kind, value, currency: p.data.kind === "fixed" ? f.currency || "XOF" : null, minSubtotalMinor: f.minSubtotal ? parseMoney(f.minSubtotal, f.currency || "XOF") : null, startsAt: f.startsAt ? new Date(f.startsAt) : null, endsAt: f.endsAt ? new Date(f.endsAt) : null, maxUses: f.maxUses ? Number(f.maxUses) : null } });
  await audit(u.id, "coupon.create", "Coupon", p.data.code);
  revalidatePath("/admin/marketing");
  return { ok: "Coupon créé." };
}

export async function savePost(_: State, fd: FormData): Promise<State> {
  const u = await requireStaff("content.edit");
  const f = obj(fd);
  const p = z.object({ title: z.string().trim().min(3).max(200), excerpt: z.string().trim().min(10).max(300), body: z.string().trim().min(50), kind: z.enum(["blog", "news"]) }).safeParse(f);
  if (!p.success) return { error: "Titre, résumé (10+ caractères) et contenu (50+ caractères) requis." };
  const slug = p.data.title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  if (await db.blogPost.findUnique({ where: { slug } })) return { error: "Un article porte déjà ce titre." };
  await db.blogPost.create({ data: { ...p.data, slug, authorId: u.id, publishedAt: f.publish === "on" ? new Date() : null } });
  await audit(u.id, "post.create", "BlogPost", slug);
  revalidatePath("/admin/marketing");
  return { ok: f.publish === "on" ? "Article publié." : "Brouillon enregistré." };
}
