import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PawPass",
    short_name: "PawPass",
    description: "Cashback solidaire pour les clients et commerçants.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#00c896",
    icons: [
      {
        src: "/pawpass-logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/pawpass-logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
