import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { randomToken, sha256, verifyPassword } from "./password";
import { can, isStaff, type Permission } from "./permissions";

const COOKIE = "mp_session";
const SESSION_DAYS = 14;
const MAX_FAILS = 5;          // par email
const MAX_FAILS_IP = 20;      // par IP
const WINDOW_MIN = 15;

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
}

export async function createSession(userId: string) {
  const token = randomToken();
  const h = await headers();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.session.create({
    data: { id: sha256(token), userId, expiresAt, ip: await clientIp(), userAgent: h.get("user-agent")?.slice(0, 250) },
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: sha256(token) } });
  jar.delete(COOKIE);
}

export type CurrentUser = { id: string; email: string; name: string; role: string; companyId: string | null; companyRole: string | null; locale: string };

export async function currentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const s = await db.session.findUnique({ where: { id: sha256(token) }, include: { user: true } });
  if (!s || s.expiresAt < new Date() || s.user.disabledAt) return null;
  const u = s.user;
  return { id: u.id, email: u.email, name: u.name, role: u.role, companyId: u.companyId, companyRole: u.companyRole, locale: u.locale };
}

export async function requireUser(next = "/fr/compte"): Promise<CurrentUser> {
  const u = await currentUser();
  if (!u) redirect(`/fr/connexion?next=${encodeURIComponent(next)}`);
  return u;
}

export async function requireStaff(perm?: Permission): Promise<CurrentUser> {
  const u = await currentUser();
  if (!u) redirect("/fr/connexion?next=/admin");
  if (!isStaff(u.role) || (perm && !can(u.role, perm))) redirect("/admin/acces-refuse");
  return u;
}

/** Vérifie les identifiants avec limitation des tentatives (par email et par IP). */
export async function attemptLogin(email: string, password: string): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const ip = await clientIp();
  const since = new Date(Date.now() - WINDOW_MIN * 60_000);
  const [failsEmail, failsIp] = await Promise.all([
    db.loginAttempt.count({ where: { email, success: false, createdAt: { gte: since } } }),
    db.loginAttempt.count({ where: { ip, success: false, createdAt: { gte: since } } }),
  ]);
  if (failsEmail >= MAX_FAILS || failsIp >= MAX_FAILS_IP) {
    return { ok: false, error: `Trop de tentatives. Réessayez dans ${WINDOW_MIN} minutes.` };
  }
  const user = await db.user.findUnique({ where: { email } });
  const valid = !!user && !user.disabledAt && (await verifyPassword(password, user.passwordHash));
  await db.loginAttempt.create({ data: { email, ip, success: valid } });
  if (!valid || !user) return { ok: false, error: "Email ou mot de passe incorrect." };
  return { ok: true, userId: user.id };
}
