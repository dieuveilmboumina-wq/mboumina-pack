import { db } from "@/lib/db";

export function Field({ name, label, type = "text", required = false, def, placeholder, autoComplete }: { name: string; label: string; type?: string; required?: boolean; def?: string | number | null; placeholder?: string; autoComplete?: string }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}{required && <span aria-hidden className="text-red-700"> *</span>}</label>
      <input id={name} name={name} type={type} className="input" required={required} defaultValue={def ?? undefined} placeholder={placeholder} autoComplete={autoComplete} />
    </div>
  );
}

export function Area({ name, label, required = false, rows = 5, def }: { name: string; label: string; required?: boolean; rows?: number; def?: string }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}{required && <span aria-hidden className="text-red-700"> *</span>}</label>
      <textarea id={name} name={name} rows={rows} className="textarea" required={required} defaultValue={def} maxLength={5000} />
    </div>
  );
}

export async function CountrySelect({ name = "country", label = "Pays", def = "SN" }: { name?: string; label?: string; def?: string }) {
  const countries = await db.country.findMany().then((cs) => cs.sort((a, b) => a.nameFr.localeCompare(b.nameFr, "fr")));
  return (
    <div>
      <label className="label" htmlFor={name}>{label}<span aria-hidden className="text-red-700"> *</span></label>
      <select id={name} name={name} className="select" defaultValue={def} required>
        {countries.map((c) => <option key={c.code} value={c.code}>{c.nameFr}</option>)}
        <option value="ZZ">Autre pays</option>
      </select>
    </div>
  );
}

/** Champ piège anti-robots (invisible pour les humains et les lecteurs d'écran). */
export function Honeypot() {
  return <div aria-hidden className="hidden"><label>Site web<input name="website" tabIndex={-1} autoComplete="off" /></label></div>;
}
