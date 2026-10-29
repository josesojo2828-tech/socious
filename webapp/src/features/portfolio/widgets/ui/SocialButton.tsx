import type { ReactNode } from "react";

interface SocialButtonProps {
  href: string;
  icon: ReactNode;
  label: string;
  brandColor: string;
}

export function SocialButton({ href, icon, label, brandColor }: SocialButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-4 px-5 py-4 rounded-2xl bg-white shadow-sm border border-[var(--p-accent)]/20 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-110"
        style={{ backgroundColor: `${brandColor}15`, color: brandColor }}
      >
        {icon}
      </div>
      <span className="text-sm font-semibold text-[var(--p-text)] group-hover:text-[var(--p-primary)] transition-colors">
        {label}
      </span>
    </a>
  );
}
