import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { can, isStaff, type Permission } from "@/lib/permissions";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { Logo } from "@/components/site";
import { logout } from "@/modules/auth/actions";

export const metadata = { title: "Back-office", robots: { index: false, follow: false } };

const NAV: [string, string, Permission][] = [
  ["/admin", "Vue générale", "dashboard.view"],
  ["/admin/commandes", "Commandes", "orders.view"],
  ["/admin/devis", "Devis", "quotes.view"],
  ["/admin/personnalisations", "Personnalisations", "customizations.view"],
  ["/admin/demandes", "Messages et demandes", "customers.view"],
  ["/admin/produits", "Produits et tarifs", "catalog.view"],
  ["/admin/categories", "Catégories", "catalog.edit"],
  ["/admin/stocks", "Stocks et entrepôts", "stock.view"],
  ["/admin/fournisseurs", "Fournisseurs", "suppliers.view"],
  ["/admin/achats", "Achats et réceptions", "suppliers.view"],
  ["/admin/clients", "Clients et entreprises", "customers.view"],
  ["/admin/livraison", "Livraison et pays", "logistics.view"],
  ["/admin/marketing", "Coupons et blog", "marketing.edit"],
  ["/admin/parametres", "Paramètres", "settings.edit"],
  ["/admin/utilisateurs", "Utilisateurs et rôles", "users.manage"],
  ["/admin/registre", "Registre des fonctionnalités", "dashboard.view"],
  ["/admin/journal", "Historique des actions", "audit.view"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await currentUser();
  if (!u || !isStaff(u.role)) {
    return <div className="mx-auto max-w-md p-10"><p>Accès réservé au personnel.</p><Link className="btn btn-primary mt-4" href="/fr/connexion?next=/admin">Se connecter</Link></div>;
  }
  return (
    <div className="min-h-screen md:grid md:grid-cols-[250px_1fr]">
      <aside className="bg-vert text-beige md:min-h-screen">
        <div className="p-5"><Link href="/admin"><Logo light /></Link></div>
        <details open className="md:open">
          <summary className="cursor-pointer px-5 pb-2 text-xs uppercase tracking-wider md:hidden">Menu</summary>
          <nav className="flex flex-col px-3 pb-6 text-sm">
            {NAV.filter(([, , p]) => can(u.role, p)).map(([href, label]) => (
              <Link key={href} href={href} className="rounded px-3 py-2 hover:bg-white/10 hover:text-white">{label}</Link>
            ))}
            <Link href="/fr" className="mt-4 rounded px-3 py-2 hover:bg-white/10">← Voir le site</Link>
          </nav>
        </details>
      </aside>
      <div>
        <header className="flex items-center justify-between border-b border-beige bg-white px-6 py-3 text-sm">
          <span>{u.name} — <strong>{ROLE_LABELS[u.role as Role]}</strong></span>
          <form action={logout}><button className="underline">Déconnexion</button></form>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
