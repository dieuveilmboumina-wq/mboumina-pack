"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { attemptLogin, createSession, destroySession, currentUser, requireUser } from "@/lib/auth";
import { hashPassword, passwordPolicyError, randomToken, sha256, verifyPassword } from "@/lib/password";
import { audit } from "@/lib/audit";
import { getCart } from "@/modules/cart/service";
import { sendMail } from "@/lib/mail";

type State = { error?: string; ok?: string } | undefined;

function safeNext(next: unknown, locale: string) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : `/${locale}/compte`;
}

async function attachCart(userId: string) {
  const cart = await getCart(false);
  if (cart && !cart.userId) await db.cart.update({ where: { id: cart.id }, data: { userId } });
}

export async function login(_: State, fd: FormData): Promise<State> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const locale = fd.get("locale") === "en" ? "en" : "fr";
  if (!email || !password) return { error: "Email et mot de passe requis." };
  const r = await attemptLogin(email, password);
  if (!r.ok) return { error: r.error };
  await createSession(r.userId);
  await attachCart(r.userId);
  await audit(r.userId, "auth.login", "User", r.userId);
  redirect(safeNext(fd.get("next"), locale));
}

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().max(30).optional(),
  password: z.string().max(200),
  accountType: z.enum(["individual", "company"]),
  companyName: z.string().trim().max(160).optional(),
  legalId: z.string().trim().max(60).optional(),
  country: z.string().length(2).optional(),
  sector: z.string().max(40).optional(),
  marketing: z.string().optional(),
  acceptTerms: z.literal("on"),
  locale: z.enum(["fr", "en"]),
});

export async function register(_: State, fd: FormData): Promise<State> {
  if (fd.get("website")) return { error: "Inscription refusée." };
  const p = registerSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "Formulaire incomplet : nom, email, mot de passe et acceptation des conditions sont requis." };
  const f = p.data;
  const pwErr = passwordPolicyError(f.password);
  if (pwErr) return { error: pwErr };
  if (await db.user.findUnique({ where: { email: f.email } })) return { error: "Un compte existe déjà avec cet email. Connectez-vous ou réinitialisez votre mot de passe." };
  if (f.accountType === "company" && (!f.companyName || !f.country)) return { error: "Raison sociale et pays requis pour un compte professionnel." };

  const user = await db.$transaction(async (tx) => {
    const company = f.accountType === "company"
      ? await tx.company.create({ data: { name: f.companyName!, legalId: f.legalId, country: f.country!, sector: f.sector } })
      : null;
    return tx.user.create({
      data: {
        name: f.name, email: f.email, phone: f.phone, passwordHash: await hashPassword(f.password), locale: f.locale,
        companyId: company?.id, companyRole: company ? "owner" : null, marketingConsent: f.marketing === "on",
      },
    });
  });
  await audit(user.id, "auth.register", "User", user.id, { accountType: f.accountType });
  await createSession(user.id);
  await attachCart(user.id);
  redirect(f.accountType === "company" ? `/${f.locale}/pro?bienvenue=1` : `/${f.locale}/compte?bienvenue=1`);
}

export async function logout() {
  const u = await currentUser();
  await destroySession();
  if (u) await audit(u.id, "auth.logout", "User", u.id);
  redirect("/fr");
}

export async function requestPasswordReset(_: State, fd: FormData): Promise<State> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const user = email ? await db.user.findUnique({ where: { email } }) : null;
  if (user && !user.disabledAt) {
    const token = randomToken();
    await db.passwordResetToken.create({ data: { id: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + 3600_000) } });
    const url = `${process.env.APP_URL ?? "http://localhost:3000"}/fr/reinitialisation?jeton=${token}`;
    await sendMail(user.email, "Réinitialisation de votre mot de passe MBOUMINA PACK", `Bonjour ${user.name},\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n${url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`);
  }
  // Même réponse que le compte existe ou non (pas de divulgation).
  return { ok: "Si un compte existe pour cet email, un lien de réinitialisation vient d'être envoyé." };
}

export async function resetPassword(_: State, fd: FormData): Promise<State> {
  const token = String(fd.get("token") ?? "");
  const pw = String(fd.get("password") ?? "");
  const err = passwordPolicyError(pw);
  if (err) return { error: err };
  const row = await db.passwordResetToken.findUnique({ where: { id: sha256(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return { error: "Lien invalide ou expiré. Faites une nouvelle demande." };
  await db.$transaction([
    db.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(pw) } }),
    db.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: row.userId } }),
  ]);
  await audit(row.userId, "auth.password_reset", "User", row.userId);
  return { ok: "Mot de passe modifié. Vous pouvez vous connecter." };
}

export async function changePassword(_: State, fd: FormData): Promise<State> {
  const u = await requireUser();
  const current = String(fd.get("current") ?? "");
  const pw = String(fd.get("password") ?? "");
  const user = await db.user.findUniqueOrThrow({ where: { id: u.id } });
  if (!(await verifyPassword(current, user.passwordHash))) return { error: "Mot de passe actuel incorrect." };
  const err = passwordPolicyError(pw);
  if (err) return { error: err };
  await db.user.update({ where: { id: u.id }, data: { passwordHash: await hashPassword(pw) } });
  await audit(u.id, "auth.password_change", "User", u.id);
  return { ok: "Mot de passe mis à jour." };
}

const profileSchema = z.object({ name: z.string().trim().min(2).max(120), phone: z.string().trim().max(30).optional(), marketing: z.string().optional() });
export async function updateProfile(_: State, fd: FormData): Promise<State> {
  const u = await requireUser();
  const p = profileSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "Nom requis." };
  await db.user.update({ where: { id: u.id }, data: { name: p.data.name, phone: p.data.phone, marketingConsent: p.data.marketing === "on" } });
  return { ok: "Profil enregistré." };
}

const addressSchema = z.object({
  label: z.string().max(60).optional(), fullName: z.string().min(2).max(120), phone: z.string().min(6).max(30),
  line1: z.string().min(3).max(200), line2: z.string().max(200).optional(), city: z.string().min(2).max(100),
  region: z.string().max(100).optional(), postalCode: z.string().max(20).optional(), country: z.string().length(2), isDefault: z.string().optional(),
});
export async function saveAddress(_: State, fd: FormData): Promise<State> {
  const u = await requireUser();
  const p = addressSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "Adresse incomplète." };
  const { isDefault, ...data } = p.data;
  if (isDefault === "on") await db.address.updateMany({ where: { userId: u.id }, data: { isDefault: false } });
  await db.address.create({ data: { ...data, userId: u.id, isDefault: isDefault === "on" } });
  return { ok: "Adresse ajoutée." };
}

/** Suppression de compte (droit à l'effacement) : anonymisation, les commandes restent pour obligations comptables. */
export async function deleteAccount(_: State, fd: FormData): Promise<State> {
  const u = await requireUser();
  if (fd.get("confirm") !== "SUPPRIMER") return { error: "Tapez SUPPRIMER pour confirmer." };
  if (u.role === "founder") return { error: "Le compte fondateur ne peut pas être supprimé depuis cet écran." };
  await db.$transaction([
    db.address.deleteMany({ where: { userId: u.id } }),
    db.favorite.deleteMany({ where: { userId: u.id } }),
    db.session.deleteMany({ where: { userId: u.id } }),
    db.user.update({ where: { id: u.id }, data: { email: `supprime-${u.id}@invalid`, name: "Compte supprimé", phone: null, passwordHash: "disabled", disabledAt: new Date(), marketingConsent: false } }),
  ]);
  await audit(u.id, "user.deleted", "User", u.id);
  redirect("/fr");
}
