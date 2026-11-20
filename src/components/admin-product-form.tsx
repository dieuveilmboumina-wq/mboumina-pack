import { db } from "@/lib/db";
import { saveProduct } from "@/modules/admin/catalog-actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import type { Product } from "@prisma/client";

function I({ name, label, def, type = "text", required = false }: { name: string; label: string; def?: string | number | null; type?: string; required?: boolean }) {
  return <div><label className="label" htmlFor={name}>{label}{required && " *"}</label><input id={name} name={name} type={type} defaultValue={def ?? ""} required={required} className="input" /></div>;
}
function T({ name, label, def }: { name: string; label: string; def?: string | null }) {
  return <div><label className="label" htmlFor={name}>{label}</label><textarea id={name} name={name} defaultValue={def ?? ""} rows={4} className="textarea" /></div>;
}
function C({ name, label, def }: { name: string; label: string; def?: boolean }) {
  return <label className="flex items-center gap-2 text-sm"><input type="checkbox" name={name} defaultChecked={def} /> {label}</label>;
}

export async function AdminProductForm({ product }: { product?: Product }) {
  const [cats, suppliers] = await Promise.all([db.category.findMany({ orderBy: { sort: "asc" } }), db.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" } })]);
  const p = product;
  return (
    <ActionForm action={saveProduct} className="card space-y-6 p-6">
      {p && <input type="hidden" name="id" value={p.id} />}
      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="mb-2 text-lg font-bold">Identification</legend>
        <I name="sku" label="Référence unique" def={p?.sku} required />
        <I name="nameFr" label="Nom (français)" def={p?.nameFr} required />
        <I name="nameEn" label="Nom (anglais)" def={p?.nameEn} />
        <div>
          <label className="label" htmlFor="categoryId">Catégorie *</label>
          <select id="categoryId" name="categoryId" defaultValue={p?.categoryId} className="select" required>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.nameFr}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="supplierId">Fournisseur</label>
          <select id="supplierId" name="supplierId" defaultValue={p?.supplierId ?? ""} className="select">
            <option value="">—</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sourcingMode">Mode d'approvisionnement</label>
          <select id="sourcingMode" name="sourcingMode" defaultValue={p?.sourcingMode ?? "stock"} className="select">
            <option value="stock">Vente sur stock</option>
            <option value="partner_on_order">Achat chez le partenaire après commande client</option>
          </select>
        </div>
      </fieldset>
      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-2 text-lg font-bold">Descriptions</legend>
        <T name="descCommercialFr" label="Description commerciale (FR)" def={p?.descCommercialFr} />
        <T name="descCommercialEn" label="Description commerciale (EN)" def={p?.descCommercialEn} />
        <T name="descTechnicalFr" label="Description technique (FR)" def={p?.descTechnicalFr} />
        <T name="descTechnicalEn" label="Description technique (EN)" def={p?.descTechnicalEn} />
      </fieldset>
      <fieldset className="grid gap-4 md:grid-cols-4">
        <legend className="mb-2 text-lg font-bold">Caractéristiques (données fournisseur)</legend>
        <I name="materials" label="Matériaux" def={p?.materials} />
        <I name="dimensions" label="Dimensions" def={p?.dimensions} />
        <I name="capacity" label="Capacité" def={p?.capacity} />
        <I name="colors" label="Couleurs" def={p?.colors} />
        <I name="finishes" label="Finitions" def={p?.finishes} />
        <I name="weightGrams" label="Poids unitaire (g)" type="number" def={p?.weightGrams} />
        <I name="unitsPerPack" label="Unités par paquet" type="number" def={p?.unitsPerPack} />
        <I name="unitsPerCarton" label="Unités par carton" type="number" def={p?.unitsPerCarton} />
        <I name="moq" label="Quantité minimale de commande" type="number" def={p?.moq ?? 1} required />
        <I name="leadTimeDays" label="Délai d'approvisionnement (j)" type="number" def={p?.leadTimeDays} />
        <I name="shipTimeDays" label="Délai d'expédition (j)" type="number" def={p?.shipTimeDays} />
        <I name="originCountry" label="Pays d'origine (si connu)" def={p?.originCountry} />
        <I name="videoUrl" label="Vidéo (URL)" type="url" def={p?.videoUrl} />
        <I name="seoTitle" label="Titre SEO" def={p?.seoTitle} />
        <I name="seoDescription" label="Description SEO" def={p?.seoDescription} />
      </fieldset>
      <fieldset className="flex flex-wrap gap-6">
        <legend className="mb-2 text-lg font-bold">Mise en avant</legend>
        <C name="isFeatured" label="Produit vedette" def={p?.isFeatured} />
        <C name="isNew" label="Nouveauté" def={p?.isNew} />
        <C name="isEco" label="Gamme écologique (caractéristiques documentées)" def={p?.isEco} />
        <C name="isCustomizable" label="Personnalisable" def={p?.isCustomizable} />
        <C name="foodContact" label="Destiné au contact alimentaire" def={p?.foodContact ?? true} />
      </fieldset>
      <SubmitButton>{p ? "Enregistrer" : "Créer le produit (brouillon)"}</SubmitButton>
    </ActionForm>
  );
}
