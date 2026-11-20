import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

/** Inscription newsletter (formulaire HTML classique). Le consentement explicite est obligatoire. */
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return new NextResponse("Origine refusée", { status: 403 }); // protection CSRF
  const fd = await req.formData();
  const p = z.object({ email: z.string().trim().toLowerCase().email().max(200), consent: z.literal("on"), locale: z.enum(["fr", "en"]).default("fr") }).safeParse(Object.fromEntries(fd));
  const locale = fd.get("locale") === "en" ? "en" : "fr";
  if (!p.success) return NextResponse.redirect(new URL(`/${locale}/newsletter?statut=erreur`, req.url), 303);
  await db.newsletterSubscriber.upsert({
    where: { email: p.data.email },
    create: { email: p.data.email, locale: p.data.locale },
    update: { unsubscribedAt: null, consentAt: new Date() },
  });
  return NextResponse.redirect(new URL(`/${locale}/newsletter?statut=ok`, req.url), 303);
}
