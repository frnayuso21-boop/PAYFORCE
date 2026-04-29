import { NextRequest, NextResponse } from "next/server";
import { createClient }             from "@supabase/supabase-js";
import { requireAuth, AuthError }   from "@/lib/auth";
import { db }                       from "@/lib/db";

export const dynamic = "force-dynamic";

// Cliente de Supabase con service role para Storage
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"];
const MAX_BYTES     = 2 * 1024 * 1024; // 2 MB

// ─── POST /api/dashboard/settings/upload-logo ─────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Autenticar
  let userId: string;
  try {
    const session = await requireAuth(req);
    userId = session.user.id;
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 2. Obtener cuenta del merchant
  const account = await db.connectedAccount.findFirst({
    where:  { userId },
    select: { id: true },
  });

  if (!account) {
    return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  }

  // 3. Leer multipart/form-data (sin Content-Type manual — lo pone el navegador)
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el archivo" }, { status: 400 });
  }

  const raw = formData.get("file");
  if (!raw || !(raw instanceof File)) {
    return NextResponse.json({ error: "Falta el campo 'file'" }, { status: 400 });
  }

  const file = raw as File;

  // 4. Validar tipo y tamaño
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tipo de archivo no permitido. Usa PNG, JPG, SVG o WebP." }, { status: 422 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo supera el límite de 2 MB." }, { status: 422 });
  }

  // 5. Convertir a Buffer y obtener extensión
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext    = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1];
  const fileName = `logos/${account.id}-${Date.now()}.${ext}`;

  // 6. Subir a Supabase Storage (bucket: merchant-assets, público)
  const { error: uploadError } = await supabase.storage
    .from("merchant-assets")
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert:      true,
    });

  if (uploadError) {
    console.error("[upload-logo] Supabase Storage error:", uploadError);
    return NextResponse.json(
      { error: "Error al subir la imagen. Verifica que el bucket 'merchant-assets' existe y es público." },
      { status: 500 },
    );
  }

  // 7. Obtener URL pública
  const { data: { publicUrl } } = supabase.storage
    .from("merchant-assets")
    .getPublicUrl(fileName);

  // 8. Actualizar logoUrl en la base de datos
  await db.connectedAccount.update({
    where: { id: account.id },
    data:  { logoUrl: publicUrl },
  });

  return NextResponse.json({ url: publicUrl });
}
