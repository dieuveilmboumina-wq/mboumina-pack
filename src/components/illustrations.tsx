/**
 * Illustrations vectorielles originales, aux couleurs de la charte MBOUMINA PACK.
 * Ce sont des pictogrammes de familles d'emballages : elles ne représentent aucun produit réel du catalogue.
 * Les photos de produits réelles s'ajoutent dans le back-office (fiche produit → médias).
 */
const V = "#183D30", V2 = "#315B45", B = "#E7D9B8", BO = "#C8B68E", K = "#B98F5E", K2 = "#9C7446", W = "#FFFFFF";

type P = { className?: string; title?: string };
const Svg = ({ className, title, children, vb = "0 0 120 120" }: P & { children: React.ReactNode; vb?: string }) => (
  <svg viewBox={vb} className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
    {children}
  </svg>
);

/** Sac kraft à poignées */
export function KraftBag(p: P) {
  return (
    <Svg {...p}>
      <path d="M44 34 C44 20 76 20 76 34" fill="none" stroke={K2} strokeWidth="4" strokeLinecap="round" />
      <path d="M26 38 H94 L90 106 H30 Z" fill={K} />
      <path d="M26 38 H94 L92 48 H28 Z" fill={K2} opacity=".45" />
      <path d="M60 60 C56 70 62 78 70 78 C72 68 66 61 60 60 Z" fill={B} />
      <path d="M50 70 L60 76 L60 90 L50 84 Z M60 76 L70 70 L70 84 L60 90 Z" fill={B} opacity=".9" />
    </Svg>
  );
}

/** Boîte repas à emporter */
export function TakeawayBox(p: P) {
  return (
    <Svg {...p}>
      <path d="M22 50 L60 34 L98 50 L60 66 Z" fill={B} />
      <path d="M22 50 L60 66 L60 104 L28 88 Z" fill={BO} />
      <path d="M60 66 L98 50 L92 88 L60 104 Z" fill={B} />
      <path d="M22 50 L60 34 L56 26 L18 42 Z" fill={W} opacity=".85" />
      <path d="M60 34 L98 50 L102 42 L64 26 Z" fill={W} opacity=".6" />
      <circle cx="78" cy="76" r="7" fill={V2} />
      <path d="M78 71 C76 75 78 79 82 79 C82 75 80 72 78 71 Z" fill={B} />
    </Svg>
  );
}

/** Gobelet avec couvercle */
export function Cup(p: P) {
  return (
    <Svg {...p}>
      <rect x="34" y="22" width="52" height="10" rx="4" fill={V} />
      <path d="M38 32 H82 L74 104 H46 Z" fill={W} />
      <path d="M40 52 H80 L77 80 H43 Z" fill={V2} />
      <path d="M60 58 C56 64 60 72 66 71 C67 64 64 60 60 58 Z" fill={B} />
      <path d="M38 32 H82 L81 38 H39 Z" fill={BO} opacity=".6" />
      <path d="M60 10 C64 14 56 16 60 20" fill="none" stroke={BO} strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

/** Boîte pâtissière à fenêtre */
export function PastryBox(p: P) {
  return (
    <Svg {...p}>
      <path d="M18 48 H102 V96 H18 Z" fill={W} />
      <path d="M18 48 L32 34 H88 L102 48 Z" fill={B} />
      <rect x="38" y="56" width="44" height="22" rx="4" fill={B} opacity=".55" />
      <path d="M46 72 C46 62 74 62 74 72 Z" fill={K} />
      <circle cx="60" cy="61" r="3.5" fill="#B5473A" />
      <path d="M18 88 H102 V96 H18 Z" fill={V2} />
    </Svg>
  );
}

/** Sachet doypack refermable */
export function Pouch(p: P) {
  return (
    <Svg {...p}>
      <path d="M36 18 H84 V24 C90 60 92 88 88 104 H32 C28 88 30 60 36 24 Z" fill={V2} />
      <path d="M36 18 H84 V28 H36 Z" fill={V} />
      <rect x="44" y="50" width="32" height="30" rx="5" fill={B} />
      <path d="M60 56 C56 62 60 70 66 69 C66 62 64 58 60 56 Z" fill={V2} />
      <path d="M40 34 H80" stroke={BO} strokeWidth="2" strokeDasharray="4 3" />
    </Svg>
  );
}

/** Barquette / contenant à couvercle */
export function Container(p: P) {
  return (
    <Svg {...p}>
      <path d="M20 56 H100 L92 92 H28 Z" fill={B} />
      <path d="M16 48 H104 V56 H16 Z" fill={W} />
      <path d="M24 40 H96 L104 48 H16 Z" fill={W} opacity=".75" />
      <path d="M28 64 H92" stroke={BO} strokeWidth="3" />
      <path d="M44 74 H76" stroke={BO} strokeWidth="3" opacity=".6" />
    </Svg>
  );
}

/** Feuille + carton (écologique) */
export function EcoLeaf(p: P) {
  return (
    <Svg {...p}>
      <path d="M26 60 L60 80 L60 106 L26 86 Z" fill={BO} />
      <path d="M60 80 L94 60 L94 86 L60 106 Z" fill={B} />
      <path d="M26 60 L60 40 L94 60 L60 80 Z" fill={W} />
      <path d="M60 64 C52 46 62 24 88 18 C90 42 78 60 60 64 Z" fill={V2} />
      <path d="M62 60 C68 46 76 34 86 22" stroke={B} strokeWidth="2" fill="none" />
    </Svg>
  );
}

/** Pinceau + boîte (personnalisation) */
export function CustomPrint(p: P) {
  return (
    <Svg {...p}>
      <path d="M22 54 L60 38 L98 54 L60 70 Z" fill={B} />
      <path d="M22 54 L60 70 L60 104 L26 88 Z" fill={BO} />
      <path d="M60 70 L98 54 L94 88 L60 104 Z" fill={W} />
      <path d="M68 80 C72 74 82 72 86 76 C84 84 74 90 68 80 Z" fill={V2} />
      <path d="M84 18 L100 34 L76 58 L68 60 L70 52 Z" fill={V} />
      <path d="M84 18 L100 34 L96 38 L80 22 Z" fill={K} />
    </Svg>
  );
}

/** Correspondance catégorie → illustration (slugs du référentiel du seed) */
export const CATEGORY_ART: Record<string, (p: P) => React.ReactElement> = {
  "emballages-alimentaires": TakeawayBox,
  "sacs-et-sachets": KraftBag,
  "boites-alimentaires": TakeawayBox,
  "emballages-restauration": Container,
  "emballages-boulangerie": KraftBag,
  "emballages-patisserie": PastryBox,
  "gobelets-et-contenants": Cup,
  "emballages-ecologiques": EcoLeaf,
  "emballages-personnalises": CustomPrint,
};

export function CategoryArt({ slug, className }: { slug: string; className?: string }) {
  const A = CATEGORY_ART[slug] ?? Pouch;
  return <A className={className} />;
}

/** Composition animée du bandeau d'accueil */
export function HeroScene() {
  return (
    <div className="hero-scene relative h-[22rem] w-[22rem]" aria-hidden>
      <div className="absolute inset-6 rounded-full bg-vert2/60 blur-2xl" />
      <div className="absolute inset-10 rounded-full border border-beige/20 anim-spin-slow" />
      <KraftBag className="anim-float absolute left-2 top-16 h-40 w-40 drop-shadow-xl" />
      <Cup className="anim-float-delay absolute right-4 top-4 h-32 w-32 drop-shadow-xl" />
      <TakeawayBox className="anim-float-slow absolute bottom-0 right-10 h-40 w-40 drop-shadow-xl" />
      <PastryBox className="anim-float-delay absolute bottom-6 left-16 h-24 w-24 drop-shadow-lg" />
    </div>
  );
}
