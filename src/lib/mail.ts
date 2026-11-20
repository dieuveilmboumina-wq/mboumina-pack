import "server-only";

/**
 * Envoi d'emails. En l'absence de SMTP configuré, le message est écrit dans la console du serveur
 * (mode développement). Brancher un fournisseur SMTP/API (variables SMTP_*) pour la production.
 */
export async function sendMail(to: string, subject: string, text: string): Promise<{ delivered: boolean }> {
  if (!process.env.SMTP_HOST) {
    console.info(`\n[email non envoyé — SMTP non configuré]\nÀ : ${to}\nObjet : ${subject}\n\n${text}\n`);
    return { delivered: false };
  }
  // Intégration SMTP à réaliser lors de la mise en production (ex. nodemailer) — volontairement non simulée.
  console.warn("[email] SMTP_HOST défini mais transport non encore intégré.");
  return { delivered: false };
}
