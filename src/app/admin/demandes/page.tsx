import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { AdminTitle, Panel } from "@/components/admin-ui";
import { markHandled } from "@/modules/admin/sales-actions";

const KIND = { contact: "Contact", partnership: "Partenariat", recruitment: "Candidature" } as Record<string, string>;

export default async function AdminRequests() {
  await requireStaff("customers.view");
  const [messages, samples, subscribers] = await Promise.all([
    db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    db.sampleRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    db.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
  ]);
  const Btn = ({ kind, id, status, label }: { kind: string; id: string; status: string; label: string }) => (
    <form action={markHandled} className="inline"><input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status} /><button className="text-xs underline">{label}</button></form>
  );
  return (
    <>
      <AdminTitle title="Messages et demandes" />
      <div className="space-y-6">
        <Panel title={`Messages (contact, partenariat, recrutement)`}>
          {messages.length === 0 ? <p className="text-sm text-noir/60">Aucun message.</p> : (
            <ul className="space-y-3">{messages.map((m) => (
              <li key={m.id} className={`rounded border p-3 text-sm ${m.status === "new" ? "border-vert2" : "border-beige opacity-70"}`}>
                <p><span className="badge">{KIND[m.kind]}</span> <strong>{m.subject}</strong> — {m.name} · <a className="underline" href={`mailto:${m.email}`}>{m.email}</a>{m.phone && ` · ${m.phone}`}{m.company && ` · ${m.company}`} · {m.createdAt.toLocaleString("fr-FR")}</p>
                <p className="mt-1 whitespace-pre-line">{m.body}</p>
                {m.fileId && <a className="underline" href={`/api/files/${m.fileId}`}>Pièce jointe</a>}
                <div className="mt-1">{m.status === "new" ? <Btn kind="message" id={m.id} status="done" label="Marquer traité" /> : <Btn kind="message" id={m.id} status="new" label="Rouvrir" />}</div>
              </li>
            ))}</ul>
          )}
        </Panel>
        <Panel title="Demandes d'échantillons">
          {samples.length === 0 ? <p className="text-sm text-noir/60">Aucune demande.</p> : (
            <table className="table text-sm"><thead><tr><th>Date</th><th>Contact</th><th>Lieu</th><th>Produits</th><th>Statut</th><th /></tr></thead>
              <tbody>{samples.map((s) => <tr key={s.id}><td>{s.createdAt.toLocaleDateString("fr-FR")}</td><td>{s.contactName}<div className="text-xs">{s.email} {s.companyName}</div></td><td>{s.city} ({s.country})</td><td>{s.products}</td><td>{s.status}</td>
                <td className="space-x-2">{["approved", "sent", "declined"].map((st) => <Btn key={st} kind="sample" id={s.id} status={st} label={st} />)}</td></tr>)}</tbody>
            </table>
          )}
        </Panel>
        <Panel title="Newsletter"><p className="text-sm">{subscribers} abonné(s) avec consentement.</p></Panel>
      </div>
    </>
  );
}
