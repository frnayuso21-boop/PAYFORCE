-- Eventos de seguridad ligados a auth.users (UUID de Supabase Auth).
-- Ejecutar en el SQL Editor del proyecto Supabase (o como migración si compartes la misma BD que Prisma).
-- Nota: la tabla Prisma `audit_logs` ya existe con `user_id` interno (cuid); esta tabla es independiente.

CREATE TABLE IF NOT EXISTS public.auth_security_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  action text NOT NULL,
  resource text,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_security_audit_user_created_idx
  ON public.auth_security_audit (user_id, created_at DESC);

ALTER TABLE public.auth_security_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_security_audit_select_own"
  ON public.auth_security_audit
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
