import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MBOUMINA PACK",
    short_name: "MBOUMINA",
    description: "Votre partenaire en solutions d'emballage alimentaire.",
    start_url: "/fr",
    display: "standalone",
    background_color: "#FAF7EF",
    theme_color: "#183D30",
    icons: [{ src: "/brand/icone.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
