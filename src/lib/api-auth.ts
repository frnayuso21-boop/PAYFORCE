/**
 * src/lib/api-auth.ts
 * Autenticación de las API públicas de PayForce (v1) mediante Bearer token.
 * Usado por los endpoints /api/v1/*
 */

import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/lib/db";
import { hashApiToken }              from "@/lib/api-key";

export class ApiAuthError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export interface ApiContext {
  accountId:  string;
  apiKeyId:   string;
  keyPrefix:  string;
}

/**
 * Extrae y valida el Bearer token del header Authorization.
 * Actualiza lastUsedAt de la key de forma asíncrona (fire-and-forget).
 */
export async function requireApiKey(req: NextRequest): Promise<ApiContext> {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer pf_")) {
    throw new ApiAuthError(401, "API key requerida. Incluye 'Authorization: Bearer pf_live_...' en la cabecera.");
  }
  const token = auth.slice("Bearer ".length).trim();
  const hash  = hashApiToken(token);

  const key = await db.apiKey.findUnique({
    where:  { keyHash: hash },
    select: { id: true, isActive: true, expiresAt: true, connectedAccountId: true, keyPrefix: true },
  });

  if (!key || !key.isActive) {
    throw new ApiAuthError(401, "API key inválida o revocada.");
  }
  if (key.expiresAt && key.expiresAt < new Date()) {
    throw new ApiAuthError(401, "API key expirada.");
  }

  // Fire-and-forget: actualiza lastUsedAt sin bloquear la respuesta
  db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return { accountId: key.connectedAccountId, apiKeyId: key.id, keyPrefix: key.keyPrefix };
}

/** Helper para respuestas de error de la API v1 */
export function apiError(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message, docs: "https://payforce.io/developers" } },
    {
      status,
      headers: {
        "Content-Type":                "application/json",
        "X-PayForce-Version":          "2025-01",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

/** Helper para respuestas de éxito de la API v1 */
export function apiOk(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Content-Type":                "application/json",
      "X-PayForce-Version":          "2025-01",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
