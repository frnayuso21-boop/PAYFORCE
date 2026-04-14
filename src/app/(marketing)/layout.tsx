import type { Metadata } from "next";
import { MarketingNav }    from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export const metadata: Metadata = {
  title: {
    default: "PayForce — Pasarela de pagos para tu negocio",
    template: "%s | PayForce",
  },
  description:
    "PayForce es la infraestructura de pagos white-label para empresas y plataformas. Acepta pagos, gestiona merchants y escala sin límites.",
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen font-sans antialiased" style={{ background: "#ffffff", overflowX: "hidden" }} suppressHydrationWarning>
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
