import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { AdminTitle, Panel } from "@/components/admin-ui";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { saveSettings } from "@/modules/admin/config-actions";
import { availableMethods } from "@/modules/payments/providers";

const FIELDS: [string, string, boolean][] = [
  ["company.legal", "Mentions légales (raison sociale, forme, NINEA, RCCM, adresse du siège) — apparaissent sur les factures", true],
  ["contact.phone", "Téléphone public", false],
  ["contact.whatsapp", "Numéro WhatsApp (format international, ex. +221…)", false],
  ["contact.email", "Email public", false],
  ["contact.address", "Adresse publique", true],
  ["contact.hours", "Horaires", false],
  ["payment.bank_details", "Coordonnées bancaires pour virement (banque, titulaire, IBAN/RIB) — active le paiement par virement", true],
  ["home.banner", "Bannière d'annonce sur la page d'accueil (vide = masquée)", false],
  ["jobs.open_positions", "Postes ouverts (page Recrutement)", true],
];

export default async function AdminSettings() {
  await requireStaff("settings.edit");
  const rows = await db.setting.findMany({ where: { key: { in: FIELDS.map(([k]) => k) } } });
  const v = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const methods = await availableMethods();
  const env = (k: string) => (process.env[k] ? "configuré" : "non configuré");
  return (
    <>
      <AdminTitle title="Paramètres" />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Panel>
          <ActionForm action={saveSettings} className="space-y-4">
            {FIELDS.map(([k, label, multi]) => (
              <div key={k}>
                <label className="label" htmlFor={k}>{label}</label>
                {multi ? <textarea id={k} name={k} defaultValue={v[k] ?? ""} rows={3} className="textarea" /> : <input id={k} name={k} defaultValue={v[k] ?? ""} className="input" />}
              </div>
            ))}
            <SubmitButton>Enregistrer</SubmitButton>
          </ActionForm>
        </Panel>
        <div className="space-y-6">
          <Panel title="Moyens de paiement actifs">
            <ul className="text-sm">{methods.length === 0 ? <li>Aucun</li> : methods.map((m) => <li key={m.id}>✓ {m.label}</li>)}</ul>
            <p className="mt-3 text-xs text-noir/70">Wave : {env("WAVE_API_KEY")} · Orange Money : {env("ORANGE_MONEY_CLIENT_ID")} · Carte : {env("CARD_PROVIDER_SECRET_KEY")} · IA : {env("ANTHROPIC_API_KEY")} · SMTP : {env("SMTP_HOST")}</p>
            <p className="mt-2 text-xs text-noir/70">Les clés des prestataires se configurent dans le fichier <code>.env</code> du serveur (jamais dans l'interface ni dans le code). Voir docs/03-guide-administrateur.md.</p>
          </Panel>
        </div>
      </div>
    </>
  );
}
