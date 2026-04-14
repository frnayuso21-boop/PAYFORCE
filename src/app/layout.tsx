import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PayForce",
    template: "%s | PayForce",
  },
  description: "Pasarela de pagos profesional para tu negocio",
  icons: {
    icon:    [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/logo.png", type: "image/png" }],
    apple:   [{ url: "/logo.png", type: "image/png" }],
    shortcut:[{ url: "/icon.svg" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
