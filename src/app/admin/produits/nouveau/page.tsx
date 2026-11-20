import { requireStaff } from "@/lib/auth";
import { AdminTitle } from "@/components/admin-ui";
import { AdminProductForm } from "@/components/admin-product-form";

export default async function NewProduct() {
  await requireStaff("catalog.edit");
  return (
    <>
      <AdminTitle title="Nouveau produit" />
      <p className="mb-4 text-sm text-noir/70">Le produit est créé en brouillon avec une variante « Standard ». Vous définirez ensuite prix, paliers, stock, images et documents, puis le publierez.</p>
      <AdminProductForm />
    </>
  );
}
