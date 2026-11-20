import { db } from "./db";

export async function audit(userId: string | null, action: string, entity: string, entityId?: string | null, data?: unknown) {
  await db.auditLog.create({
    data: { userId, action, entity, entityId: entityId ?? null, data: data === undefined ? null : JSON.stringify(data).slice(0, 10_000) },
  });
}

/** Numérotation lisible : PREFIX-AAAA-000123, séquentielle par préfixe et par année. */
export async function nextNumber(prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  const key = `seq:${prefix}:${year}`;
  const n = await db.$transaction(async (tx) => {
    const s = await tx.setting.findUnique({ where: { key } });
    const next = (s ? Number(s.value) : 0) + 1;
    await tx.setting.upsert({ where: { key }, create: { key, value: String(next) }, update: { value: String(next) } });
    return next;
  });
  return `${prefix}-${year}-${String(n).padStart(6, "0")}`;
}
