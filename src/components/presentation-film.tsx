"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { KraftBag, TakeawayBox, Cup, PastryBox, Pouch, Container, CustomPrint, EcoLeaf } from "./illustrations";

/**
 * Film de présentation animé (HTML/SVG, sans fichier vidéo).
 * Les textes reprennent uniquement ce que la plateforme propose réellement : aucun chiffre, client ou certification inventé.
 * Si une vraie vidéo est renseignée dans Paramètres (home.video_url), elle remplace ce film.
 */
type Scene = { kicker: string; title: string; text: string; art: React.ReactNode };

const SCENES: Scene[] = [
  {
    kicker: "MBOUMINA PACK",
    title: "Votre partenaire en solutions d'emballage alimentaire",
    text: "Une plateforme pour trouver, commander et personnaliser vos emballages.",
    art: (
      <div className="relative h-44 w-44">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/icone.svg" alt="" className="film-pop h-44 w-44" />
      </div>
    ),
  },
  {
    kicker: "Pour qui ?",
    title: "Restaurants, boulangeries, hôtels, traiteurs, commerces et industriels",
    text: "Des emballages adaptés à chaque métier de l'alimentaire.",
    art: (
      <div className="grid grid-cols-3 gap-3">
        <TakeawayBox className="film-pop h-20 w-20 [animation-delay:.1s]" />
        <KraftBag className="film-pop h-20 w-20 [animation-delay:.25s]" />
        <Cup className="film-pop h-20 w-20 [animation-delay:.4s]" />
        <PastryBox className="film-pop h-20 w-20 [animation-delay:.55s]" />
        <Container className="film-pop h-20 w-20 [animation-delay:.7s]" />
        <Pouch className="film-pop h-20 w-20 [animation-delay:.85s]" />
      </div>
    ),
  },
  {
    kicker: "Détail & gros",
    title: "Du paquet au volume professionnel",
    text: "Achetez au détail ou en gros, avec des prix par paliers de quantité et des tarifs négociés pour les comptes professionnels.",
    art: (
      <div className="flex items-end gap-2">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="film-rise flex flex-col items-center" style={{ animationDelay: `${n * 0.15}s` }}>
            <TakeawayBox className="h-14 w-14" />
            <div className="w-12 rounded-t bg-beige/80" style={{ height: `${n * 22}px` }} />
          </div>
        ))}
      </div>
    ),
  },
  {
    kicker: "Personnalisation",
    title: "Vos emballages à vos couleurs",
    text: "Réalisés par nos partenaires spécialisés, après validation du prix, du délai, de la faisabilité et du BAT.",
    art: <CustomPrint className="film-pop h-44 w-44" />,
  },
  {
    kicker: "Simple & sûr",
    title: "Commandez en ligne, suivez votre commande",
    text: "Devis, commande, paiement vérifié, facture et suivi de livraison au même endroit.",
    art: (
      <div className="flex items-center gap-3">
        {["Devis", "Commande", "Paiement", "Livraison"].map((s, i) => (
          <div key={s} className="film-pop flex flex-col items-center gap-1" style={{ animationDelay: `${i * 0.2}s` }}>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-beige font-bold text-vert">{i + 1}</span>
            <span className="text-xs text-beige">{s}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    kicker: "Engagement",
    title: "Des alternatives plus responsables",
    text: "Des emballages en papier, carton et fibres végétales, dont les caractéristiques sont documentées sur chaque fiche.",
    art: <EcoLeaf className="film-pop h-44 w-44" />,
  },
];

const DURATION = 6000;

function embedFor(url: string): { kind: "iframe" | "video"; src: string } | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return null;
    const yt = u.hostname.replace(/^www\./, "");
    if (yt === "youtu.be") return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}` };
    if (yt === "youtube.com" || yt === "m.youtube.com") {
      const id = u.searchParams.get("v") ?? u.pathname.split("/").filter(Boolean).pop();
      return id ? { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}` } : null;
    }
    if (yt === "vimeo.com") return { kind: "iframe", src: `https://player.vimeo.com/video/${u.pathname.split("/").filter(Boolean).pop()}` };
    if (/\.(mp4|webm)$/i.test(u.pathname)) return { kind: "video", src: u.toString() };
  } catch { /* URL invalide : on garde le film animé */ }
  return null;
}

export function PresentationFilm({ videoUrl, ctaQuote, ctaCatalogue }: { videoUrl?: string | null; ctaQuote: React.ReactNode; ctaCatalogue: React.ReactNode }) {
  const embed = videoUrl ? embedFor(videoUrl) : null;
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const userPaused = useRef(false);

  // Démarre automatiquement quand le film est visible (sauf si l'utilisateur préfère réduire les animations).
  useEffect(() => {
    if (embed || !box.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([e]) => { if (!userPaused.current) setPlaying(e.isIntersecting); }, { threshold: 0.4 });
    io.observe(box.current);
    return () => io.disconnect();
  }, [embed]);

  useEffect(() => {
    if (!playing) return;
    const start = performance.now() - elapsed;
    let raf = 0;
    const tick = (now: number) => {
      const e = now - start;
      if (e >= DURATION) { setElapsed(0); setI((x) => (x + 1) % SCENES.length); return; }
      setElapsed(e);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, i]);

  const go = useCallback((n: number) => { setI((n + SCENES.length) % SCENES.length); setElapsed(0); }, []);
  const toggle = () => { userPaused.current = playing; setPlaying(!playing); };

  if (embed) {
    return (
      <div className="overflow-hidden rounded-2xl bg-noir shadow-2xl">
        {embed.kind === "iframe" ? (
          <iframe src={embed.src} title="Vidéo de présentation MBOUMINA PACK" className="aspect-video w-full" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
        ) : (
          <video src={embed.src} controls preload="metadata" className="aspect-video w-full" />
        )}
      </div>
    );
  }

  const s = SCENES[i];
  return (
    <div ref={box} className="film relative overflow-hidden rounded-2xl bg-vert text-white shadow-2xl" role="region" aria-roledescription="présentation" aria-label="Présentation animée de MBOUMINA PACK">
      <div className="absolute inset-x-4 top-4 z-10 flex gap-1.5" aria-hidden>
        {SCENES.map((_, n) => (
          <span key={n} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
            <span className="block h-full bg-beige" style={{ width: n < i ? "100%" : n === i ? `${(elapsed / DURATION) * 100}%` : "0%" }} />
          </span>
        ))}
      </div>
      <div className="film-bg absolute inset-0" aria-hidden />
      <div key={i} className="relative grid min-h-[22rem] items-center gap-8 px-6 pb-16 pt-12 md:grid-cols-[1fr_auto] md:px-12">
        <div aria-live="polite">
          <p className="film-in text-xs font-semibold uppercase tracking-[0.3em] text-beige">{s.kicker}</p>
          <h3 className="film-in mt-3 text-2xl !text-white [animation-delay:.15s] md:text-4xl">{s.title}</h3>
          <p className="film-in mt-4 max-w-xl text-beige/90 [animation-delay:.3s]">{s.text}</p>
          {i === SCENES.length - 1 && <div className="film-in mt-6 flex flex-wrap gap-3 [animation-delay:.45s]">{ctaQuote}{ctaCatalogue}</div>}
        </div>
        <div className="flex justify-center">{s.art}</div>
      </div>
      <div className="absolute inset-x-4 bottom-4 z-10 flex items-center gap-2">
        <button type="button" onClick={() => go(i - 1)} className="film-btn" aria-label="Scène précédente">‹</button>
        <button type="button" onClick={toggle} className="film-btn !w-auto px-3 text-sm" aria-label={playing ? "Mettre en pause" : "Lire la présentation"}>{playing ? "❚❚ Pause" : "▶ Lire"}</button>
        <button type="button" onClick={() => go(i + 1)} className="film-btn" aria-label="Scène suivante">›</button>
        <span className="ml-auto text-xs text-beige/80">{i + 1} / {SCENES.length}</span>
      </div>
    </div>
  );
}
