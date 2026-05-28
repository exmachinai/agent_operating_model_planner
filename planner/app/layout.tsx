import type { Metadata, Viewport } from "next";
import "./styles/tokens.css";

export const metadata: Metadata = {
  title: "AEGIRA Planner",
  description:
    "ZGPM-konformer Multi-Agent-Planner — Evidence-based AI Trust, nachweisbar, audit-ready.",
  applicationName: "AEGIRA Planner",
  authors: [{ name: "exmachinAI GmbH" }],
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#1E2761",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
