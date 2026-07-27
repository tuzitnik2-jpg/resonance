import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Rubik, Bebas_Neue } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/sw-register";
import "./globals.css";

// Rubik: warm, slightly rounded workhorse for all UI/body text. latin-ext covers Czech diacritics.
const rubik = Rubik({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

// Bebas Neue: tall condensed display face — the classic reggae sound-system flyer look. Used only
// for the wordmark and eyebrow labels (via --font-display), never for dynamic content titles.
const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Resonance",
  description: "Osobní hudební archiv a inteligentní průvodce moderní hudbou",
  applicationName: "Resonance",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Resonance" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0806",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs" className={`${rubik.variable} ${bebas.variable}`}>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
