/**
 * Cashea brand mark.
 *
 * Every place the payment method shows up uses this same asset so a Cashea sale
 * is recognizable at a glance (POS, configuración, caja and sale detail) without
 * reading the raw `CASHEA` code.
 */

export type CasheaLogoSize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<CasheaLogoSize, string> = {
  sm: "h-3.5",
  md: "h-4",
  lg: "h-6",
};

export function CasheaLogo({
  size = "md",
  className = "",
}: {
  size?: CasheaLogoSize;
  className?: string;
}) {
  return (
    <img
      src="/brands/cashea.png"
      alt="Cashea"
      className={`${SIZE_CLASS[size]} w-auto shrink-0 ${className}`.trim()}
    />
  );
}
