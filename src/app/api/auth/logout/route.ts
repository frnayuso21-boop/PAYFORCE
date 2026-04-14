import { NextResponse }               from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL no está definida.");
  }
  return NextResponse.redirect(new URL("/", appUrl));
}
