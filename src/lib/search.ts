// Filtre « contient » insensible à la casse, quelle que soit la base :
// SQLite (développement) l'est déjà pour l'ASCII ; PostgreSQL (production) a besoin de mode: "insensitive",
// option que le client Prisma SQLite ne connaît pas — d'où l'ajout seulement en PostgreSQL.
const IS_POSTGRES = /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "");

export function ci(q: string): { contains: string } {
  return (IS_POSTGRES ? { contains: q, mode: "insensitive" } : { contains: q }) as { contains: string };
}
