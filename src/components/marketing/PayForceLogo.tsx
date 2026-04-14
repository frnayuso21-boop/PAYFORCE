import Image from "next/image";

interface Props {
  variant?: "dark" | "white";
  height?: number;
  className?: string;
}

/**
 * PayForceLogo
 *
 * El PNG (800×150 px) ya está recortado y tiene fondo transparente.
 *
 * variant="dark"  → logo negro  (nav, fondos claros)
 * variant="white" → logo blanco (footer, fondos oscuros)
 */
export function PayForceLogo({
  variant   = "dark",
  height    = 32,
  className = "",
}: Props) {
  // Relación de aspecto real del PNG recortado: 800 / 150
  const width = Math.round((height * 800) / 150);

  return (
    <Image
      src="/logo-payforce.png"
      alt="PayForce"
      width={width}
      height={height}
      priority
      className={className}
      style={{
        height,
        width: "auto",
        display: "block",
        flexShrink: 0,
        ...(variant === "white"
          ? { filter: "invert(1) brightness(2)" }
          : {}),
      }}
    />
  );
}
