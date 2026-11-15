import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VeloDoc Studio — Precision Document Workbench",
    short_name: "VeloDoc",
    description: "100% private, client-side document workbench with exact size compression, batch tools & academic presentations.",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F5F1",
    theme_color: "#141413",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
