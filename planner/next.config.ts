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
          // SAMEORIGIN (nicht DENY): erlaubt das same-origin-Einbetten des
          // Explainer-Onboardings (/explainer rahmt /explainer/index.html); blockt
          // weiterhin Cross-Origin-Framing (Clickjacking). frame-ancestors 'self'
          // setzt dasselbe modern/explizit für Browser, die CSP bevorzugen.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
