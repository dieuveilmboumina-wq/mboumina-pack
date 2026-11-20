"use server";
import { z } from "zod";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { nextNumber, audit } from "@/lib/audit";
import { saveUpload, UploadError } from "@/lib/files";
import { pricedCart } from "@/modules/cart/service";

type State = { error?: string; ok?: string } | undefined;

const str = (max: number) => z.string().trim().max(max);
const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined);

/** Anti-robots : champ piège invisible + limitation simple par IP (10 envois / heure / type). */
async function botCheck(fd: FormData, kind: string): Promise<string | null> {
  if (fd.get("website")) return "Envoi refusé.";
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  const key = `rl:${kind}:${ip}:${new Date().toISOString().slice(0, 13)}`;
  const s = await db.setting.findUnique({ where: { key } });
  const n = (s ? Number(s.value) : 0) + 1;
  await db.setting.upsert({ where: { key }, create: { key, value: "1" }, update: { value: String(n) } });
  return n > 10 ? "Trop d'envois depuis votre connexion. Réessayez dans une heure." : null;
}

const quoteSchema = z.object({
  contactName: str(120).min(2), email: z.string().email().max(200), phone: opt(30), companyName: opt(160),
  country: str(2).min(2), kind: z.enum(["standard", "b2b", "custom"]).default("standard"),
  request: str(5000).min(10, "Décrivez votre besoin (10 caractères minimum)."), includeCart: z.string().optional(), product: opt(60),
});

export async function submitQuoteRequest(_: State, fd: FormData): Promise<State> {
  const bot = await botCheck(fd, "quote");
  if (bot) return { error: bot };
  const p = quoteSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Formulaire invalide." };
  const f = p.data;
  const user = await currentUser();
  const lines: { variantId: string; description: string; qty: number; unitPriceMinor: number }[] = [];
  let currency = "XOF";
  if (f.includeCart === "on") {
    const cart = await pricedCart(user?.companyId);
    currency = cart.currency;
    for (const l of cart.lines) lines.push({ variantId: l.variantId, description: `${l.name} — ${l.variantLabel} (${l.sku})`, qty: l.qty, unitPriceMinor: l.unitPriceMinor ?? 0 });
  }
  const number = await nextNumber("DEV");
  const q = await db.quote.create({
    data: {
      number, userId: user?.id, companyId: user?.companyId, contactName: f.contactName, email: f.email.toLowerCase(), phone: f.phone,
      companyName: f.companyName, country: f.country.toUpperCase(), kind: f.kind, status: "requested", currency,
      request: f.product ? `[Produit ${f.product}] ${f.request}` : f.request, lines: { create: lines },
    },
  });
  await audit(user?.id ?? null, "quote.requested", "Quote", q.id);
  return { ok: `Demande de devis ${number} enregistrée. Notre équipe commerciale vous répond par email${f.phone ? " ou téléphone" : ""}.` };
}

const sampleSchema = z.object({
  contactName: str(120).min(2), email: z.string().email(), phone: opt(30), companyName: opt(160),
  country: str(2).min(2), city: str(100).min(2), products: str(2000).min(3), message: opt(2000),
});

export async function submitSampleRequest(_: State, fd: FormData): Promise<State> {
  const bot = await botCheck(fd, "sample");
  if (bot) return { error: bot };
  const p = sampleSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "Merci de compléter les champs obligatoires." };
  await db.sampleRequest.create({ data: { ...p.data, email: p.data.email.toLowerCase(), country: p.data.country.toUpperCase() } });
  return { ok: "Demande d'échantillons enregistrée. Nous vous confirmons les échantillons disponibles et les conditions d'envoi." };
}

const contactSchema = z.object({
  kind: z.enum(["contact", "partnership", "recruitment"]), name: str(120).min(2), email: z.string().email(), phone: opt(30),
  company: opt(160), country: opt(60), subject: str(200).min(2), body: str(5000).min(10),
});

export async function submitContact(_: State, fd: FormData): Promise<State> {
  const bot = await botCheck(fd, "contact");
  if (bot) return { error: bot };
  const p = contactSchema.safeParse(Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")));
  if (!p.success) return { error: "Merci de compléter les champs obligatoires (message de 10 caractères minimum)." };
  let fileId: string | undefined;
  try {
    const up = await saveUpload(fd.get("file") as File | null, null, ["application/pdf"]);
    fileId = up?.id;
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
  await db.contactMessage.create({ data: { ...p.data, email: p.data.email.toLowerCase(), fileId } });
  const msg = { contact: "Message envoyé. Nous vous répondons rapidement.", partnership: "Demande de partenariat envoyée. Nous l'étudions et revenons vers vous.", recruitment: "Candidature envoyée. Merci de votre intérêt pour MBOUMINA PACK." };
  return { ok: msg[p.data.kind] };
}

const customSchema = z.object({
  contactName: str(120).min(2), email: z.string().email(), phone: opt(30), companyName: opt(160),
  packagingType: str(120).min(2), product: opt(60), dimensions: opt(120), material: opt(120), colors: opt(200),
  finish: opt(120), printSides: z.enum(["recto", "recto_verso"]).optional(), printText: opt(300),
  quantity: z.coerce.number().int().min(1).max(10_000_000), description: str(5000).min(10), design: opt(4000), wantsMockup: z.string().optional(),
});

export async function submitCustomization(_: State, fd: FormData): Promise<State> {
  const bot = await botCheck(fd, "custom");
  if (bot) return { error: bot };
  const p = customSchema.safeParse(Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")));
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Formulaire incomplet." };
  const f = p.data;
  const user = await currentUser();
  let logo, artwork;
  try {
    logo = await saveUpload(fd.get("logo") as File | null, user?.id ?? null, ["image/png", "image/jpeg", "image/svg+xml", "image/webp", "application/pdf"]);
    artwork = await saveUpload(fd.get("artwork") as File | null, user?.id ?? null);
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
  const product = f.product ? await db.product.findUnique({ where: { sku: f.product } }) : null;
  const number = await nextNumber("PERSO");
  await db.customizationRequest.create({
    data: {
      number, userId: user?.id, contactName: f.contactName, email: f.email.toLowerCase(), phone: f.phone, companyName: f.companyName,
      productId: product?.id, packagingType: f.packagingType, dimensions: f.dimensions, material: f.material, colors: f.colors, finish: f.finish,
      printSides: f.printSides, printText: f.printText, quantity: f.quantity, description: f.description, design: f.design,
      logoFileId: logo?.id, artworkFileId: artwork?.id, wantsMockup: f.wantsMockup === "on",
    },
  });
  return { ok: `Demande ${number} reçue. Notre équipe étudie la faisabilité avec nos partenaires, puis vous envoie maquette et devis. Rien n'est lancé avant votre validation du prix, du délai et du bon à tirer (BAT).` };
}
