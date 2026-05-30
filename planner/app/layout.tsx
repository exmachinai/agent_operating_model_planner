import type { Metadata, Viewport } from "next";
import "./styles/tokens.css";
import { FAVICON_DATA_URI } from "../lib/brand-logo";
import { LockProvider } from "../lib/lockProvider";

export const metadata: Metadata = {
  title: "AEGIRA — Agent Operating Model Planner",
  description:
    "ZGPM-konformer Multi-Agent-Planner — Evidence-based AI Trust, nachweisbar, audit-ready.",
  applicationName: "AEGIRA — Agent Operating Model Planner",
  authors: [{ name: "exmachinAI GmbH" }],
  // Inline Data-URI: Next.js-Standalone liefert public/-Favicons mit 400 aus.
  icons: {
    icon: FAVICON_DATA_URI,
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
      <body>
        <LockProvider>{children}</LockProvider>
      </body>
    </html>
  );
}
