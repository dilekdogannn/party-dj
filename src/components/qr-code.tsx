import { create } from "qrcode";

/** Renders a QR code as plain SVG, so it stays sharp at any size. */
export function QrCode({ value, className }: { value: string; className?: string }) {
  const { size, data } = create(value, { errorCorrectionLevel: "M" }).modules;
  const quietZone = 2;

  let path = "";
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (data[row * size + col]) path += `M${col + quietZone} ${row + quietZone}h1v1h-1z`;
    }
  }

  const viewSize = size + quietZone * 2;
  return (
    <svg
      viewBox={`0 0 ${viewSize} ${viewSize}`}
      className={className}
      role="img"
      aria-label={`QR code for ${value}`}
      shapeRendering="crispEdges"
    >
      <rect width={viewSize} height={viewSize} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}
