import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "primary" | "accent";
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  const styles = {
    default: "bg-[var(--p-accent)]/20 text-[var(--p-secondary)]",
    primary: "bg-[var(--p-primary)] text-white",
    accent: "bg-[var(--p-accent)] text-[var(--p-text)]",
  };

  return (
    <span
      className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full ${styles[variant]}`}
    >
      {children}
    </span>
  );
}
