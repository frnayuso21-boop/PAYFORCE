import type { SupabaseClient } from "@supabase/supabase-js";

type MfaApi = {
  challengeAndVerify?: (args: { factorId: string; code: string }) => Promise<{ data: unknown; error: Error | null }>;
  challenge: (args: { factorId: string }) => Promise<{ data: { id: string } | null; error: Error | null }>;
  verify: (args: { factorId: string; challengeId: string; code: string }) => Promise<{ data: unknown; error: Error | null }>;
};

/**
 * Verificación TOTP con MFA nativo de Supabase (challengeAndVerify si existe, si no challenge + verify).
 */
export async function mfaChallengeAndVerify(
  supabase: SupabaseClient,
  factorId: string,
  code: string,
): Promise<{ error: Error | null }> {
  const mfa = supabase.auth.mfa as MfaApi;
  if (typeof mfa.challengeAndVerify === "function") {
    const { error } = await mfa.challengeAndVerify({ factorId, code });
    return { error: error as Error | null };
  }
  const { data: ch, error: ce } = await supabase.auth.mfa.challenge({ factorId });
  if (ce || !ch) return { error: ce as Error | null };
  const { error: ve } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: ch.id,
    code,
  });
  return { error: ve as Error | null };
}
