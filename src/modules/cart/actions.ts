"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCart } from "./service";

const addSchema = z.object({
  variantId: z.string().min(1),
  qty: z.coerce.number().int().min(1).max(1_000_000),
  locale: z.enum(["fr", "en"]).default("fr"),
});

export async function addToCart(formData: FormData) {
  const data = addSchema.parse(Object.fromEntries(formData));
  const variant = await db.productVariant.findFirst({ where: { id: data.variantId, active: true, product: { status: "active" } }, include: { product: true } });
  if (!variant) throw new Error("Produit indisponible");
  const qty = Math.max(data.qty, variant.product.moq);
  const cart = (await getCart(true))!;
  await db.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
    create: { cartId: cart.id, variantId: variant.id, qty },
    update: { qty: { increment: qty } },
  });
  revalidatePath(`/${data.locale}`, "layout");
  redirect(`/${data.locale}/panier?ajout=1`);
}

export async function updateCartItem(formData: FormData) {
  const itemId = z.string().parse(formData.get("itemId"));
  const qty = z.coerce.number().int().min(0).max(1_000_000).parse(formData.get("qty"));
  const locale = formData.get("locale") === "en" ? "en" : "fr";
  const cart = await getCart(false);
  if (!cart) return;
  const item = await db.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, include: { variant: { include: { product: true } } } });
  if (!item) return;
  if (qty === 0) await db.cartItem.delete({ where: { id: item.id } });
  else await db.cartItem.update({ where: { id: item.id }, data: { qty: Math.max(qty, item.variant.product.moq) } });
  revalidatePath(`/${locale}/panier`);
}
