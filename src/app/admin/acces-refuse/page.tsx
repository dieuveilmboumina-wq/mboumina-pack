import Link from "next/link";

export default function Denied() {
  return (
    <div className="card max-w-lg p-8">
      <h1 className="text-2xl">Accès refusé</h1>
      <p className="mt-2">Votre rôle ne donne pas accès à cette section. Contactez le fondateur ou un administrateur si nécessaire.</p>
      <Link href="/admin" className="btn btn-primary mt-4">Retour au tableau de bord</Link>
    </div>
  );
}
