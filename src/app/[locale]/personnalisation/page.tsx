import type { Metadata } from "next";
import { currentUser } from "@/lib/auth";
import { submitCustomization } from "@/modules/requests/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Configurator } from "@/components/configurator";
import { Area, Field, Honeypot } from "@/components/fields";
import { PageHeader } from "@/components/site";

export const metadata: Metadata = { title: "Emballages personnalisés — configurateur", description: "Personnalisez vos emballages alimentaires : logo, couleurs, texte, finitions. Devis et BAT avant toute réalisation." };

export default async function CustomizationPage({ searchParams }: { searchParams: Promise<{ produit?: string }> }) {
  const sp = await searchParams;
  const user = await currentUser();
  return (
    <>
      <PageHeader title="Emballages personnalisés" intro="Vos emballages à vos couleurs. La réalisation est confiée à nos partenaires d'impression spécialisés." />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <ol className="mb-8 grid gap-3 text-sm md:grid-cols-5">
          {["Vous configurez et envoyez votre demande", "Nous étudions la faisabilité avec nos partenaires", "Vous recevez maquette et devis", "Vous validez le bon à tirer (BAT)", "Réalisation et livraison"].map((s, i) => (
            <li key={s} className="card p-3"><strong className="text-vert">{i + 1}.</strong> {s}</li>
          ))}
        </ol>
        <ActionForm action={submitCustomization} className="card space-y-6 p-6">
          <Honeypot />
          {sp.produit && <input type="hidden" name="product" value={sp.produit} />}
          <h2 className="text-2xl">1. Votre design</h2>
          <Configurator />
          <h2 className="text-2xl">2. Spécifications</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field name="dimensions" label="Dimensions souhaitées" placeholder="ex. 20 × 15 × 5 cm" />
            <div>
              <label className="label" htmlFor="material">Matériau</label>
              <select id="material" name="material" className="select" defaultValue="">
                <option value="">À conseiller</option><option>Carton</option><option>Papier kraft</option><option>Carton ondulé</option><option>Fibre moulée</option><option>Plastique</option><option>Aluminium</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="finish">Finition</label>
              <select id="finish" name="finish" className="select" defaultValue="">
                <option value="">À conseiller</option><option>Mate</option><option>Brillante</option><option>Vernis sélectif</option><option>Dorure</option><option>Sans finition</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="printSides">Impression</label>
              <select id="printSides" name="printSides" className="select" defaultValue="recto"><option value="recto">Recto</option><option value="recto_verso">Recto-verso</option></select>
            </div>
            <Field name="quantity" label="Quantité" type="number" required def={1000} />
            <div>
              <label className="label" htmlFor="artwork">Fichier graphique complet (facultatif)</label>
              <input id="artwork" name="artwork" type="file" accept="application/pdf,image/png,image/jpeg,image/svg+xml" className="input" />
            </div>
          </div>
          <Area name="description" label="Décrivez votre besoin (produit emballé, usage, QR code ou code-barres à intégrer, délai souhaité)" required />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="wantsMockup" defaultChecked /> Je souhaite recevoir une maquette</label>
          <h2 className="text-2xl">3. Vos coordonnées</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="contactName" label="Nom et prénom" required def={user?.name} />
            <Field name="email" label="Email" type="email" required def={user?.email} />
            <Field name="phone" label="Téléphone / WhatsApp" type="tel" />
            <Field name="companyName" label="Entreprise / marque" />
          </div>
          <p className="text-sm text-noir/70">Aucune commande personnalisée n'est lancée avant votre validation du prix, du délai, de la faisabilité et du BAT.</p>
          <SubmitButton>Envoyer ma demande de personnalisation</SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}
