import { Sidebar }       from "@/components/layout/Sidebar";
import { Topbar }        from "@/components/layout/Topbar";
import { BottomNav }     from "@/components/mobile/BottomNav";
import { FloatingButton } from "@/components/mobile/FloatingButton";
import { BrandProvider } from "@/context/BrandContext";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <BrandProvider>
      {/* ── DESKTOP (md+): layout con sidebar lateral ──────────────────────── */}
      <div className="hidden md:flex h-screen overflow-hidden bg-white min-w-[1200px]">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden border-l border-[#E5E7EB]">
          <Topbar />
          <main className="flex-1 overflow-y-auto bg-[#F9FAFB]">{children}</main>
        </div>
      </div>

      {/* ── MOBILE (<md): layout tipo app nativa ───────────────────────────── */}
      <div className="flex flex-col md:hidden min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50">
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24">
          {children}
        </main>
        <BottomNav />
        <FloatingButton />
      </div>
    </BrandProvider>
  );
}
