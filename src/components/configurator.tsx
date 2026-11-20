"use client";
import { useEffect, useMemo, useState } from "react";

const SHAPES = {
  box: "Boîte / barquette",
  bag: "Sac / sachet",
  cup: "Gobelet",
  pizza: "Boîte plate (pizza, pâtisserie)",
} as const;
type Shape = keyof typeof SHAPES;
const POSITIONS = { center: "Centre", top: "Haut", bottom: "Bas" } as const;

/**
 * Configurateur 2D : aperçu indicatif uniquement.
 * Le rendu final est défini par la maquette et le BAT du partenaire d'impression.
 */
export function Configurator() {
  const [shape, setShape] = useState<Shape>("box");
  const [base, setBase] = useState("#E7D9B8");
  const [ink, setInk] = useState("#183D30");
  const [text, setText] = useState("");
  const [pos, setPos] = useState<keyof typeof POSITIONS>("center");
  const [scale, setScale] = useState(1);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => () => { if (logoUrl) URL.revokeObjectURL(logoUrl); }, [logoUrl]);

  const design = useMemo(() => JSON.stringify({ shape, base, ink, text, pos, scale }), [shape, base, ink, text, pos, scale]);
  const y = pos === "top" ? 70 : pos === "bottom" ? 150 : 110;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <input type="hidden" name="design" value={design} />
      <input type="hidden" name="packagingType" value={SHAPES[shape]} />
      <div className="space-y-4">
        <fieldset>
          <legend className="label">Type d'emballage</legend>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(SHAPES) as Shape[]).map((s) => (
              <label key={s} className="flex cursor-pointer items-center gap-2 rounded-lg border border-beige p-2 text-sm has-[:checked]:border-vert2 has-[:checked]:bg-beige/40">
                <input type="radio" name="_shape" checked={shape === s} onChange={() => setShape(s)} /> {SHAPES[s]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label" htmlFor="base">Couleur de fond</label><input id="base" type="color" value={base} onChange={(e) => setBase(e.target.value)} className="h-10 w-full rounded" /></div>
          <div><label className="label" htmlFor="ink">Couleur d'impression</label><input id="ink" type="color" value={ink} onChange={(e) => setInk(e.target.value)} className="h-10 w-full rounded" /></div>
        </div>
        <input type="hidden" name="colors" value={`Fond ${base} / impression ${ink}`} />
        <div>
          <label className="label" htmlFor="logo">Votre logo (PNG, JPG, SVG, PDF — 10 Mo max.)</label>
          <input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp,application/pdf" className="input"
            onChange={(e) => { const f = e.target.files?.[0]; setLogoUrl(f && f.type.startsWith("image/") ? URL.createObjectURL(f) : null); }} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="pos">Position du logo</label>
            <select id="pos" className="select" value={pos} onChange={(e) => setPos(e.target.value as keyof typeof POSITIONS)}>
              {Object.entries(POSITIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="scale">Taille du logo</label>
            <input id="scale" type="range" min={0.5} max={1.6} step={0.1} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="w-full" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="printText">Texte / slogan</label>
          <input id="printText" name="printText" className="input" maxLength={60} value={text} onChange={(e) => setText(e.target.value)} />
        </div>
      </div>

      <figure className="card flex flex-col items-center justify-center p-6">
        <svg viewBox="0 0 240 240" className="h-72 w-72" role="img" aria-label="Aperçu indicatif de l'emballage personnalisé">
          {shape === "box" && (<><path d="M30 80 L120 120 L120 220 L30 180 Z" fill={base} stroke="#0002" /><path d="M120 120 L210 80 L210 180 L120 220 Z" fill={base} stroke="#0002" style={{ filter: "brightness(.85)" }} /><path d="M30 80 L120 40 L210 80 L120 120 Z" fill={base} stroke="#0002" style={{ filter: "brightness(1.08)" }} /></>)}
          {shape === "bag" && (<><rect x="50" y="50" width="140" height="170" rx="6" fill={base} stroke="#0002" /><path d="M90 50 C90 20 150 20 150 50" fill="none" stroke="#0004" strokeWidth="6" /></>)}
          {shape === "cup" && (<path d="M60 40 L180 40 L165 220 L75 220 Z" fill={base} stroke="#0002" />)}
          {shape === "pizza" && (<><rect x="20" y="80" width="200" height="110" rx="4" fill={base} stroke="#0002" /><rect x="20" y="70" width="200" height="14" fill={base} stroke="#0002" style={{ filter: "brightness(.85)" }} /></>)}
          {logoUrl ? (
            <image href={logoUrl} x={120 - 40 * scale} y={y - 25 * scale} width={80 * scale} height={50 * scale} preserveAspectRatio="xMidYMid meet" />
          ) : (
            <text x="120" y={y} textAnchor="middle" fontSize={14 * scale} fill={ink} opacity=".5">VOTRE LOGO</text>
          )}
          {text && <text x="120" y={Math.min(y + 40 * scale, 210)} textAnchor="middle" fontSize="12" fontWeight="700" fill={ink}>{text}</text>}
        </svg>
        <figcaption className="mt-3 text-center text-xs text-noir/60">Aperçu indicatif. Le rendu final est validé sur maquette et bon à tirer (BAT).</figcaption>
      </figure>
    </div>
  );
}
