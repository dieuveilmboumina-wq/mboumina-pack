import { ImageResponse } from "next/og";

// Image de partage (WhatsApp, Facebook, LinkedIn…) : uniquement le nom et le slogan réels de la marque.
export const alt = "MBOUMINA PACK — Votre partenaire en solutions d'emballage alimentaire";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #183D30 0%, #183D30 55%, #315B45 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ width: 120, height: 120, borderRadius: 28, background: "#E7D9B8", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="76" height="76" viewBox="0 0 64 64">
              <path d="M14 22h36l-4 34H18z" fill="#C8B68E" stroke="#183D30" strokeWidth="3" strokeLinejoin="round" />
              <path d="M24 22v-6a8 8 0 0 1 16 0v6" fill="none" stroke="#183D30" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: 2 }}>MBOUMINA</div>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 22, color: "#E7D9B8" }}>PACK</div>
          </div>
        </div>
        <div style={{ marginTop: 56, fontSize: 44, lineHeight: 1.25, maxWidth: 980 }}>
          Votre partenaire en solutions d&apos;emballage alimentaire.
        </div>
        <div style={{ marginTop: 28, fontSize: 28, color: "#E7D9B8" }}>
          Détail · Gros · Personnalisation · Espace professionnel
        </div>
      </div>
    ),
    size,
  );
}
