import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/constants";
import { AdminTitle, Panel } from "@/components/admin-ui";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { createStaff, changeRole, toggleUser } from "@/modules/admin/config-actions";

export default async function AdminUsers() {
  const u = await requireStaff("users.manage");
  const staff = await db.user.findMany({ where: { role: { not: "customer" } }, orderBy: { createdAt: "asc" }, include: { sessions: { orderBy: { createdAt: "desc" }, take: 1 } } });
  const assignable = ROLES.filter((r) => r !== "founder" && r !== "customer" && (r !== "admin" || u.role === "founder"));
  return (
    <>
      <AdminTitle title="Utilisateurs et rôles" />
      <div className="space-y-6">
        <Panel>
          <table className="table text-sm"><thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Dernière session</th><th>État</th><th /></tr></thead>
            <tbody>{staff.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td><td>{s.email}</td>
                <td>{s.role === "founder" || !can(u.role, "roles.manage") ? ROLE_LABELS[s.role as Role] : (
                  <form action={changeRole} className="flex gap-1"><input type="hidden" name="id" value={s.id} />
                    <select name="role" defaultValue={s.role} className="select !py-1" aria-label="Rôle">{[...assignable, "customer" as const].map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
                    <button className="text-xs underline">OK</button></form>
                )}</td>
                <td>{s.sessions[0] ? `${s.sessions[0].createdAt.toLocaleString("fr-FR")} (${s.sessions[0].ip})` : "—"}</td>
                <td>{s.disabledAt ? "Désactivé" : "Actif"}</td>
                <td>{s.role !== "founder" && s.id !== u.id && <form action={toggleUser}><input type="hidden" name="id" value={s.id} /><button className="text-xs underline">{s.disabledAt ? "Réactiver" : "Désactiver"}</button></form>}</td>
              </tr>
            ))}</tbody>
          </table>
        </Panel>
        <Panel title="Créer un compte employé">
          <ActionForm action={createStaff} className="grid gap-2 sm:grid-cols-4">
            <input name="name" className="input" placeholder="Nom" required aria-label="Nom" />
            <input name="email" type="email" className="input" placeholder="Email" required aria-label="Email" />
            <select name="role" className="select" aria-label="Rôle">{assignable.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
            <input name="password" type="password" className="input" placeholder="Mot de passe initial" required autoComplete="new-password" aria-label="Mot de passe initial" />
            <div className="sm:col-span-4"><SubmitButton>Créer</SubmitButton></div>
          </ActionForm>
        </Panel>
        <Panel title="Matrice des droits">
          <ul className="space-y-1 text-sm">
            <li><strong>Fondateur</strong> : tous les droits, dont rôles, crédit client et sécurité.</li>
            <li><strong>Administrateur</strong> : tout sauf gestion des rôles et autorisation de crédit.</li>
            <li><strong>Commercial</strong> : commandes, devis, personnalisations, clients, marketing.</li>
            <li><strong>Responsable des stocks</strong> : stocks, entrepôts, achats (création), réceptions, coûts d'achat.</li>
            <li><strong>Comptable</strong> : paiements, rapprochements, finances, rapports.</li>
            <li><strong>Préparateur</strong> : consultation et préparation des commandes.</li>
            <li><strong>Responsable logistique</strong> : expéditions, transporteurs, zones et tarifs.</li>
          </ul>
        </Panel>
      </div>
    </>
  );
}
