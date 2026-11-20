"use client";
import { useEffect, useRef } from "react";

/**
 * Révèle en douceur les éléments [data-reveal] contenus quand ils entrent dans l'écran.
 * Sans JavaScript ou avec « réduire les animations », le contenu reste visible (voir globals.css).
 */
export function Reveal({ children, className, as: Tag = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "section" }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.classList.add("reveal-ready");
    const items = root.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!("IntersectionObserver" in window)) { items.forEach((el) => el.classList.add("is-visible")); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    items.forEach((el, i) => { el.style.setProperty("--reveal-delay", `${Math.min(i % 8, 6) * 70}ms`); io.observe(el); });
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref as React.RefObject<HTMLDivElement>} className={className}>{children}</Tag>;
}
