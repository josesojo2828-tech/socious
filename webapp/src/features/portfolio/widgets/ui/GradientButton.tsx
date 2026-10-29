import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

interface GradientButtonProps {
  children: ReactNode;
  href: string;
  variant?: "primary" | "white" | "outline";
  size?: "md" | "lg";
  showArrow?: boolean;
  className?: string;
}

export function GradientButton({
  children,
  href,
  variant = "primary",
  size = "md",
  showArrow = false,
  className = "",
}: GradientButtonProps) {
  const sizeStyles = {
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-lg",
  };

  const variantStyles = {
    primary:
      "bg-gradient-to-r from-[var(--p-primary)] to-[var(--p-secondary)] text-white shadow-lg shadow-[var(--p-primary)]/25 hover:shadow-xl hover:shadow-[var(--p-primary)]/30",
    white:
      "bg-white text-[var(--p-primary)] shadow-xl hover:shadow-2xl",
    outline:
      "bg-transparent text-[var(--p-primary)] border-2 border-[var(--p-primary)] hover:bg-[var(--p-primary)] hover:text-white",
  };

  return (
    <a
      href={href}
      className={`inline-flex items-center gap-2 rounded-2xl font-bold hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
      {showArrow && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
    </a>
  );
}
