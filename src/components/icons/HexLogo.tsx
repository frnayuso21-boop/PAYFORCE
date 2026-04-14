import React from "react";

interface HexLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Logo hexagonal de PayForce — SVG inline, sin fondo, sin márgenes.
 * Se ve nítido a cualquier tamaño.
 */
export function HexLogo({ size = 28, className, style }: HexLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      className={className}
      style={style}
      aria-label="PayForce"
    >
      <polygon
        points="50,3 95,27 95,73 50,97 5,73 5,27"
        fill="currentColor"
      />
    </svg>
  );
}
