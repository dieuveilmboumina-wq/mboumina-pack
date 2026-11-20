import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { AdminTitle, Panel } from "@/components/admin-ui";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { saveCategory } from "@/modules/admin/catalog-actions";

export default async function AdminCategories() {
  await requireStaff("catalog.edit");
  const cats = await db.category.findMany({ orderBy: [{ parentId: "asc" }, { sort: "asc" }], include: { parent: true, _count: { select: { products: true } } } });
  return (
    <>
      <AdminTitle title="Catégories" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="card overflow-x-auto">
          <table className="table"><thead><tr><th>Nom</th><th>Anglais</th><th>Parent</th><th>Produits</th><th>URL</th></tr></thead>
            <tbody>{cats.map((c) => <tr key={c.id}><td>{c.nameFr}</td><td>{c.nameEn}</td><td>{c.parent?.nameFr ?? "—"}</td><td>{c._count.products}</td><td className="text-xs">/categorie/{c.slug}</td></tr>)}</tbody>
          </table>
        </div>
        <Panel title="Nouvelle catégorie ou sous-catégorie">
          <ActionForm action={saveCategory} className="space-y-3">
            <div><label className="label" htmlFor="nameFr">Nom (FR)</label><input id="nameFr" name="nameFr" className="input" required /></div>
            <div><label className="label" htmlFor="nameEn">Nom (EN)</label><input id="nameEn" name="nameEn" className="input" /></div>
            <div><label className="label" htmlFor="descFr">Description</label><textarea id="descFr" name="descFr" className="textarea" rows={3} /></div>
            <div><label className="label" htmlFor="parentId">Catégorie parente</label><select id="parentId" name="parentId" className="select"><option value="">Aucune (catégorie principale)</option>{cats.filter((c) => !c.parentId).map((c) => <option key={c.id} value={c.id}>{c.nameFr}</option>)}</select></div>
            <SubmitButton>Créer</SubmitButton>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
