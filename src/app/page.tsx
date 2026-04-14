import { redirect } from "next/navigation";

// Redirigir a /home (página marketing principal)
export default function RootPage() {
  redirect("/home");
}

export const dynamic = "force-dynamic";
