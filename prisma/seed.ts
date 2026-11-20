/**
 * Seed MBOUMINA PACK : uniquement des RÉFÉRENTIELS (structure), aucune donnée commerciale inventée.
 * - Catégories du catalogue (structure, sans produits)
 * - Pays (vente désactivée par défaut : à activer après vérification de la couverture transporteur)
 * - Devises + parité fixe officielle XOF/EUR (655,957 — parité BCEAO, fixe depuis 1999)
 * - Registre des 500 fonctionnalités
 * - Compte fondateur
 * Idempotent : peut être relancé sans écraser les données existantes.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import path from "node:path";
import { hashPassword } from "../src/lib/password";

const db = new PrismaClient();

const CATEGORIES: [string, string, string, string][] = [
  ["emballages-alimentaires", "Emballages alimentaires", "Food packaging", "Solutions d'emballage pour tous les produits alimentaires."],
  ["sacs-et-sachets", "Sacs et sachets", "Bags and pouches", "Sacs kraft, sachets, pochettes et sacs de transport."],
  ["boites-alimentaires", "Boîtes alimentaires", "Food boxes", "Boîtes repas, barquettes, boîtes à emporter."],
  ["emballages-restauration", "Emballages de restauration", "Food service packaging", "Contenants pour restaurants, fast-foods et livraison."],
  ["emballages-boulangerie", "Emballages de boulangerie", "Bakery packaging", "Sacs à pain, sachets viennoiserie, papiers."],
  ["emballages-patisserie", "Emballages de pâtisserie", "Pastry packaging", "Boîtes à gâteaux, plateaux, caissettes."],
  ["gobelets-et-contenants", "Gobelets et contenants", "Cups and containers", "Gobelets, pots, couvercles et contenants liquides."],
  ["emballages-ecologiques", "Emballages écologiques", "Eco-friendly packaging", "Alternatives à base de papier, carton, fibres végétales — caractéristiques documentées par fiche."],
  ["emballages-personnalises", "Emballages personnalisés", "Custom packaging", "Emballages imprimés à vos couleurs, réalisés par nos partenaires."],
];

// [code, nomFr, nomEn, devise, fuseau]
const COUNTRIES: [string, string, string, string, string][] = [
  ["SN", "Sénégal", "Senegal", "XOF", "Africa/Dakar"],
  ["CI", "Côte d'Ivoire", "Côte d'Ivoire", "XOF", "Africa/Abidjan"],
  ["ML", "Mali", "Mali", "XOF", "Africa/Bamako"],
  ["BF", "Burkina Faso", "Burkina Faso", "XOF", "Africa/Ouagadougou"],
  ["BJ", "Bénin", "Benin", "XOF", "Africa/Porto-Novo"],
  ["TG", "Togo", "Togo", "XOF", "Africa/Lome"],
  ["NE", "Niger", "Niger", "XOF", "Africa/Niamey"],
  ["GW", "Guinée-Bissau", "Guinea-Bissau", "XOF", "Africa/Bissau"],
  ["CG", "Congo", "Republic of the Congo", "XAF", "Africa/Brazzaville"],
  ["CM", "Cameroun", "Cameroon", "XAF", "Africa/Douala"],
  ["GA", "Gabon", "Gabon", "XAF", "Africa/Libreville"],
  ["TD", "Tchad", "Chad", "XAF", "Africa/Ndjamena"],
  ["CF", "Centrafrique", "Central African Republic", "XAF", "Africa/Bangui"],
  ["GQ", "Guinée équatoriale", "Equatorial Guinea", "XAF", "Africa/Malabo"],
  ["CD", "RD Congo", "DR Congo", "USD", "Africa/Kinshasa"],
  ["GN", "Guinée", "Guinea", "USD", "Africa/Conakry"],
  ["MR", "Mauritanie", "Mauritania", "USD", "Africa/Nouakchott"],
  ["GM", "Gambie", "Gambia", "USD", "Africa/Banjul"],
  ["MA", "Maroc", "Morocco", "EUR", "Africa/Casablanca"],
  ["NG", "Nigeria", "Nigeria", "USD", "Africa/Lagos"],
  ["GH", "Ghana", "Ghana", "USD", "Africa/Accra"],
  ["FR", "France", "France", "EUR", "Europe/Paris"],
  ["BE", "Belgique", "Belgium", "EUR", "Europe/Brussels"],
  ["US", "États-Unis", "United States", "USD", "America/New_York"],
];

async function main() {
  for (const [i, [slug, nameFr, nameEn, descFr]] of CATEGORIES.entries()) {
    await db.category.upsert({ where: { slug }, update: {}, create: { slug, nameFr, nameEn, descFr, sort: i } });
  }

  for (const [code, nameFr, nameEn, currency, timezone] of COUNTRIES) {
    await db.country.upsert({ where: { code }, update: {}, create: { code, nameFr, nameEn, currency, timezone } });
  }

  for (const [code, symbol, decimals] of [["XOF", "FCFA", 0], ["XAF", "FCFA", 0], ["EUR", "€", 2], ["USD", "$", 2]] as const) {
    await db.currency.upsert({ where: { code }, update: {}, create: { code, symbol, decimals } });
  }
  const parity = await db.exchangeRate.findFirst({ where: { base: "EUR", quote: "XOF" } });
  if (!parity) {
    const fetchedAt = new Date("1999-01-01T00:00:00Z");
    await db.exchangeRate.createMany({
      data: [
        { base: "EUR", quote: "XOF", rate: "655.957", source: "Parité fixe BCEAO", fetchedAt },
        { base: "XOF", quote: "EUR", rate: String(1 / 655.957), source: "Parité fixe BCEAO", fetchedAt },
        { base: "EUR", quote: "XAF", rate: "655.957", source: "Parité fixe BEAC", fetchedAt },
        { base: "XAF", quote: "EUR", rate: String(1 / 655.957), source: "Parité fixe BEAC", fetchedAt },
      ],
    });
  }

  const reg = JSON.parse(readFileSync(path.join(__dirname, "..", "docs", "registre-fonctionnalites.json"), "utf8")) as {
    modules: { n: number; name: string; phase: number; features: string[] }[];
  };
  for (const m of reg.modules) {
    for (const [i, name] of m.features.entries()) {
      const code = (m.n - 1) * 25 + i + 1;
      await db.feature.upsert({ where: { code }, update: { name, moduleName: m.name, phase: m.phase }, create: { code, module: m.n, moduleName: m.name, name, phase: m.phase } });
    }
  }

  // Statuts vérifiés (docs/registre-statuts.json) : appliqués seulement aux fonctionnalités encore « à faire »,
  // pour ne jamais écraser un statut modifié dans le back-office.
  const st = JSON.parse(readFileSync(path.join(__dirname, "..", "docs", "registre-statuts.json"), "utf8")) as { majAu: string; statuts: [string, string, string][] };
  const seen = new Set<number>();
  let applied = 0;
  for (const [key, status, notes] of st.statuts) {
    const [mod, pos] = key.split(".").map(Number);
    const count = reg.modules.find((x) => x.n === mod)?.features.length ?? 0;
    if (!["done", "in_progress", "blocked"].includes(status) || !(pos >= 1 && pos <= count)) throw new Error(`registre-statuts.json : entrée invalide ${key} ${status}`);
    const code = (mod - 1) * 25 + pos;
    if (seen.has(code)) throw new Error(`registre-statuts.json : doublon ${key}`);
    seen.add(code);
    const r = await db.feature.updateMany({
      where: { code, status: "todo" },
      data: { status, notes, verifiedAt: status === "done" ? new Date(`${st.majAu}T12:00:00Z`) : null },
    });
    applied += r.count;
  }
  console.log(`Registre : ${applied} statut(s) appliqué(s) sur ${st.statuts.length} (les statuts déjà modifiés sont conservés).`);

  const email = process.env.FOUNDER_EMAIL?.trim().toLowerCase();
  const pw = process.env.FOUNDER_INITIAL_PASSWORD;
  if (email && pw) {
    const exists = await db.user.findUnique({ where: { email } });
    if (!exists) {
      if (pw.length < 12) throw new Error("FOUNDER_INITIAL_PASSWORD trop court (12 caractères minimum).");
      await db.user.create({ data: { email, name: "Dieuveil Flavien MBOUMINA BAKADISSA", role: "founder", passwordHash: await hashPassword(pw), emailVerifiedAt: new Date() } });
      console.log("Compte fondateur créé."); // l'adresse n'est pas écrite dans les journaux du serveur
    }
  } else {
    console.warn("FOUNDER_EMAIL / FOUNDER_INITIAL_PASSWORD absents : compte fondateur non créé.");
  }

  await db.setting.upsert({ where: { key: "company.name" }, update: {}, create: { key: "company.name", value: "MBOUMINA PACK" } });
  console.log("Seed terminé.");
}

main().finally(() => db.$disconnect());
