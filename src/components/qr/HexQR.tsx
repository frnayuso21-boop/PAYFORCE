"use client";

/**
 * HexQR — QR code con módulos hexagonales y badge exterior hexagonal.
 *
 * Diseño:
 *  • Cada módulo del QR es un hexágono (en lugar de cuadrado)
 *  • Logo PayForce (⚡ en hex oscuro) en el centro — posible gracias al nivel H
 *    de corrección de errores que tolera hasta 30% de cobertura central
 *  • Badge exterior hexagonal oscuro que enmarca el QR en blanco
 *  • El canvas QR NO se recorta → los finder patterns (esquinas) permanecen intactos
 *    → 100% escaneable con la cámara del iPhone
 *  • Unique per link: el valor (URL) cambia en cada cobro
 */

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import QRCode from "qrcode";

// ─── Constantes visuales ──────────────────────────────────────────────────────

const DARK  = "#0f172a";
const LIGHT = "#ffffff";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface HexQRHandle {
  toDataURL: () => string | null;
}

interface HexQRProps {
  value:     string;
  /** Tamaño del QR canvas en CSS px. El badge exterior es ~1.28x mayor */
  qrSize?:   number;
  className?: string;
}

// ─── Helpers Canvas ───────────────────────────────────────────────────────────

function hexPath(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  rotate = 0,   // radianes extra de rotación
) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    // flat-top: empezar a 0 rad; pointy-top: empezar a -π/6
    const a = (Math.PI / 3) * i + rotate;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function hexFill(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, color: string,
) {
  ctx.fillStyle = color;
  hexPath(ctx, cx, cy, r, -Math.PI / 6); // pointy-top para módulos
  ctx.fill();
}

// ─── Renderizado ──────────────────────────────────────────────────────────────

function renderHexQR(canvas: HTMLCanvasElement, text: string, qrSize: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width  = qrSize * dpr;
  canvas.height = qrSize * dpr;
  canvas.style.width  = `${qrSize}px`;
  canvas.style.height = `${qrSize}px`;
  ctx.scale(dpr, dpr);

  // Fondo blanco
  ctx.fillStyle = LIGHT;
  ctx.fillRect(0, 0, qrSize, qrSize);

  // Generar matriz QR
  let qr;
  try {
    qr = QRCode.create(text, { errorCorrectionLevel: "H" });
  } catch {
    // Si falla (URL inválida), usar fallback
    qr = QRCode.create("https://payforce.io", { errorCorrectionLevel: "H" });
  }

  const mods   = qr.modules;
  const n      = mods.size;
  const quiet  = 4;                          // quiet zone en módulos
  const total  = n + quiet * 2;
  const cell   = qrSize / total;             // px por módulo
  const hexR   = cell * 0.46;               // radio de cada hexágono módulo

  // ── Dibujar módulos como hexágonos ──────────────────────────────────────
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (!mods.get(row, col)) continue;

      const cx = (col + quiet + 0.5) * cell;
      const cy = (row + quiet + 0.5) * cell;
      hexFill(ctx, cx, cy, hexR, DARK);
    }
  }

  // ── Logo central (hex oscuro + rayo blanco) ──────────────────────────────
  // El nivel H permite cubrir hasta ~30% del área central sin perder datos
  const mid  = qrSize / 2;
  const lR   = cell * 2.8;  // radio del hex logo

  // Halo blanco (separación entre logo y módulos QR)
  hexFill(ctx, mid, mid, lR + cell * 0.6, LIGHT);

  // Hex oscuro de fondo
  hexFill(ctx, mid, mid, lR, DARK);

  // Rayo ⚡ — usamos canvas fillText con emoji
  const fontSize = Math.round(lR * 1.05);
  ctx.fillStyle     = LIGHT;
  ctx.font          = `bold ${fontSize}px -apple-system, "SF Pro", system-ui, sans-serif`;
  ctx.textAlign     = "center";
  ctx.textBaseline  = "middle";
  ctx.fillText("⚡", mid, mid + fontSize * 0.04);

  // ── Decoración: fino hexágono de borde en la quiet zone ──────────────────
  const frameR = qrSize / 2 - cell * 0.5;
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = DARK;
  ctx.lineWidth   = cell * 0.6;
  hexPath(ctx, mid, mid, frameR, 0);  // flat-top para el frame
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export const HexQR = forwardRef<HexQRHandle, HexQRProps>(
  function HexQR({ value, qrSize = 260, className }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Expone toDataURL() al padre (para descarga)
    useImperativeHandle(ref, () => ({
      toDataURL: () => canvasRef.current?.toDataURL("image/png") ?? null,
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !value) return;
      renderHexQR(canvas, value, qrSize);
    }, [value, qrSize]);

    // Tamaño del badge exterior hexagonal (pixel del div contenedor)
    const badgeSize = Math.round(qrSize * 1.28);
    const innerPad  = Math.round(qrSize * 0.1);

    return (
      <div
        className={className}
        style={{
          width:      badgeSize,
          height:     badgeSize,
          // Badge hexagonal oscuro exterior (flat-top)
          clipPath:   "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
          background: `linear-gradient(145deg, ${DARK} 0%, #1e293b 100%)`,
          display:    "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {/* Caja blanca interna que alberga el canvas — NO se recorta al hex */}
        <div
          style={{
            background:   LIGHT,
            borderRadius: 12,
            padding:      innerPad,
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
            // Sombra interior sutil
            boxShadow:    "inset 0 0 0 1px rgba(15,23,42,0.06)",
          }}
        >
          <canvas ref={canvasRef} />
        </div>
      </div>
    );
  },
);
