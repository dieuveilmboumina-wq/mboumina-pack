// Génère prisma/postgres/schema.prisma (production, PostgreSQL) à partir de prisma/schema.prisma (développement, SQLite).
// Le modèle de données est identique ; seul le fournisseur de base change.
//   node scripts/prisma-postgres.mjs          → (re)génère le fichier
//   node scripts/prisma-postgres.mjs --check  → échoue si le fichier versionné n'est plus à jour (utilisé au build Render)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const src = readFileSync(path.join(root, "prisma", "schema.prisma"), "utf8").replace(/\r\n/g, "\n");
const pattern = /datasource db \{\n\s*provider\s*=\s*"sqlite"\n/;
if (!pattern.test(src)) throw new Error('prisma/schema.prisma : bloc datasource avec provider = "sqlite" introuvable.');
const out =
  "// FICHIER GÉNÉRÉ par scripts/prisma-postgres.mjs — ne pas modifier à la main.\n// Source : prisma/schema.prisma (même modèle, fournisseur PostgreSQL pour la production).\n\n" +
  src.replace(pattern, 'datasource db {\n  provider = "postgresql"\n');
const target = path.join(root, "prisma", "postgres", "schema.prisma");

if (process.argv.includes("--check")) {
  const current = existsSync(target) ? readFileSync(target, "utf8").replace(/\r\n/g, "\n") : "";
  if (current !== out) {
    console.error("prisma/postgres/schema.prisma n'est pas à jour : lancez « node scripts/prisma-postgres.mjs » puis créez une migration (voir docs/06-publication-render.md).");
    process.exit(1);
  }
  console.log("Schéma PostgreSQL à jour.");
} else {
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, out);
  console.log(`Écrit : ${path.relative(root, target)}`);
}
