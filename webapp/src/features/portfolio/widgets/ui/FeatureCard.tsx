import type { ReactNode } from "react";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="group relative bg-white rounded-2xl shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
      {/* Accent bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[var(--p-primary)] to-[var(--p-accent)]" />

      <div className="p-6 md:p-8 flex flex-col items-start gap-4 flex-1">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--p-primary)]/20 to-[var(--p-accent)]/20 flex items-center justify-center group-hover:scale-110 group-hover:from-[var(--p-primary)] group-hover:to-[var(--p-secondary)] transition-all duration-300">
          <div className="w-7 h-7 text-[var(--p-primary)] group-hover:text-white transition-colors duration-300 flex items-center justify-center">
            {icon}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-[var(--p-primary)] mb-2">{title}</h3>
          <p className="text-[var(--p-text)] leading-relaxed text-sm md:text-base">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
