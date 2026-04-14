/**
 * src/lib/rate-limit.ts
 *
 * Rate limiter en memoria con ventana deslizante.
 * En serverless cada instancia tiene su propio store (aceptable para dev y
 * como capa de defensa adicional en producción con una sola instancia).
 * Para producción multi-instancia reemplazar con Upstash Redis.
 */

interface Entry {
  count:   number;
  resetAt: number;
}

const store = new Map<string, Entry>();

export interface RateLimitConfig {
  /** Tamaño de la ventana en milisegundos */
  windowMs: number;
  /** Número máximo de peticiones permitidas en la ventana */
  max:      number;
}

export interface RateLimitResult {
  success:   boolean;
  remaining: number;
  resetAt:   number;
}

/**
 * Comprueba y registra una solicitud contra el rate limiter.
 * @param key      Identificador único (ej. `userId:endpoint` o `ip:endpoint`)
 * @param config   Ventana y límite
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now   = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: config.max - 1, resetAt };
  }

  entry.count += 1;

  if (entry.count > config.max) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { success: true, remaining: config.max - entry.count, resetAt: entry.resetAt };
}

/**
 * Extrae la IP del cliente desde los headers de la request.
 */
export function getClientIp(req: Request): string {
  const headers = req.headers as { get(name: string): string | null };
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    headers.get("x-real-ip") ??
    "local"
  );
}

// Limpieza periódica en desarrollo para evitar memory leaks
// En serverless el proceso se recicla solo
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60_000);

// Node no bloquea el proceso por este interval
if (typeof cleanup.unref === "function") cleanup.unref();
