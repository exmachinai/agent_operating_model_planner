import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Standalone output produziert eine schlanke .next/standalone/ folder
  // ohne node_modules — ideal für Docker-Multi-Stage-Builds.
  output: "standalone",
  // typedRoutes bewusst AUS (v0.5): Die App navigiert durchgängig über
  // interpolierte dynamische Routen (`/projects/${id}/...`). Mit typedRoutes meldet
  // der Typchecker auf jeder dieser Stellen einen RouteImpl-Fehlalarm ohne
  // Mehrwert. Wieder aktivieren, sobald ein zentraler typisierter Routen-Helfer
  // statt freier Strings genutzt wird.
  typedRoutes: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
