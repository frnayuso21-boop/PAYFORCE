"use client";

import Link from "next/link";
import { Bell, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Topbar() {
 return (
 <header className="flex h-14 items-center justify-between border-b border-slate-100 bg-white px-6 rounded-tl-2xl rounded-tr-2xl">

 {/* Búsqueda */}
 <div className="relative w-56">
 <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"/>
 <Input
 placeholder="Buscar..."className="pl-9 h-8 text-sm border-slate-200 bg-slate-50 rounded-lg focus:bg-white placeholder:text-slate-400"/>
 </div>

 {/* Derecha: notificaciones + ajustes */}
 <div className="flex items-center gap-1">
 <Button variant="ghost"size="icon-sm"className="relative text-slate-400 hover:text-slate-600">
 <Bell className="h-4 w-4"/>
 <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-slate-900"/>
 </Button>

 <Link href="/app/settings">
 <Button variant="ghost"size="icon-sm"className="text-slate-400 hover:text-slate-600">
 <Settings className="h-4 w-4"/>
 </Button>
 </Link>
 </div>
 </header>
 );
}
