import crypto   from "crypto";
import bcryptjs from "bcryptjs";

const SALT_ROUNDS = 12;

export function generateBackupCodesPlain(count = 10): string[] {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(4).toString("hex").slice(0, 8).toUpperCase(),
  );
}

export async function hashBackupCodes(plain: string[]): Promise<string[]> {
  return Promise.all(plain.map((c) => bcryptjs.hash(c.replace(/\s/g, "").toUpperCase(), SALT_ROUNDS)));
}

export async function verifyAndConsumeBackupCode(
  input: string,
  hashesJson: string | null,
): Promise<{ ok: boolean; remainingHashes: string[] | null }> {
  const norm = input.replace(/\s/g, "").toUpperCase();
  if (!norm || !hashesJson) return { ok: false, remainingHashes: null };
  let hashes: string[];
  try {
    hashes = JSON.parse(hashesJson) as string[];
  } catch {
    return { ok: false, remainingHashes: null };
  }
  for (let i = 0; i < hashes.length; i++) {
    // eslint-disable-next-line no-await-in-loop
    if (await bcryptjs.compare(norm, hashes[i])) {
      const remaining = hashes.filter((_, j) => j !== i);
      return { ok: true, remainingHashes: remaining };
    }
  }
  return { ok: false, remainingHashes: null };
}
