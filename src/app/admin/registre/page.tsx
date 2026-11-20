import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { AdminTitle } from "@/components/admin-ui";
import { setFeatureStatus } from "@/modules/admin/config-actions";

const LABEL = { todo: "À faire", in_progress: "En cours", done: "Vérifiée", blocked: "Intervention humaine" } as Record<string, string>;
const COLOR = { todo: "", in_progress: "!bg-amber-100", done: "!bg-green-100", blocked: "!bg-red-100" } as Record<string, string>;

export default async function Registry({ searchParams }: { searchParams: Promise<{ module?: string; statut?: string }> }) {
  const u = await requireStaff("dashboard.view");
  const sp = await searchParams;
  const all = await db.feature.findMany({ orderBy: { code: "asc" } });
  const modules = [...new Map(all.map((f) => [f.module, f.moduleName])).entries()];
  const shown = all.filter((f) => (!sp.module || f.module === Number(sp.module)) && (!sp.statut || f.status === sp.statut));
  const count = (s: string) => all.filter((f) => f.status === s).length;
  const edit = can(u.role, "features.edit");
  return (
    <>
      <AdminTitle title="Registre des 500 fonctionnalités" />
      <p className="mb-4 text-sm">{count("done")} vérifiées · {count("in_progress")} en cours · {count("blocked")} nécessitent une intervention humaine · {count("todo")} à faire. Une fonctionnalité n'est marquée « vérifiée » qu'après test.</p>
      <div className="mb-4 grid gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {modules.map(([n, name]) => {
          const fs = all.filter((f) => f.module === n);
          const done = fs.filter((f) => f.status === "done").length;
          return <a key={n} href={`?module=${n}`} className="card p-3 text-xs hover:shadow"><strong>{n}. {name}</strong><div className="mt-1 h-1.5 rounded bg-beige"><div className="h-1.5 rounded bg-vert2" style={{ width: `${(done / fs.length) * 100}%` }} /></div><span>{done}/25</span></a>;
        })}
      </div>
      <form className="mb-3 flex gap-2">
        {sp.module && <input type="hidden" name="module" value={sp.module} />}
        <select name="statut" defaultValue={sp.statut ?? ""} className="select max-w-xs" aria-label="Statut"><option value="">Tous statuts</option>{Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <button className="btn btn-ghost">Filtrer</button>
        {(sp.module || sp.statut) && <a href="?" className="btn btn-ghost">Tout afficher</a>}
      </form>
      <div className="card overflow-x-auto">
        <table className="table text-sm">
          <thead><tr><th>N°</th><th>Module</th><th>Fonctionnalité</th><th>Phase</th><th>Statut</th><th>Notes</th></tr></thead>
          <tbody>{shown.map((f) => (
            <tr key={f.code}>
              <td>{String(f.code).padStart(3, "0")}</td><td>{f.moduleName}</td><td>{f.name}</td><td>{f.phase}</td>
              <td colSpan={2}>
                {edit ? (
                  <form action={setFeatureStatus} className="flex gap-1">
                    <input type="hidden" name="code" value={f.code} />
                    <select name="status" defaultValue={f.status} className={`select !w-auto !py-0.5 text-xs ${COLOR[f.status]}`} aria-label="Statut">{Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                    <input name="notes" defaultValue={f.notes ?? ""} className="input !py-0.5 text-xs" aria-label="Notes" />
                    <button className="text-xs underline">OK</button>
                  </form>
                ) : <><span className={`badge ${COLOR[f.status]}`}>{LABEL[f.status]}</span> {f.notes}</>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
