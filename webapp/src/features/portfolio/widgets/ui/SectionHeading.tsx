import { Badge } from "./Badge";

interface SectionHeadingProps {
  badge?: string;
  title: string;
  subtitle?: string;
}

export function SectionHeading({ badge, title, subtitle }: SectionHeadingProps) {
  return (
    <div className="text-center mb-12 md:mb-16">
      {badge && <Badge>{badge}</Badge>}
      <h2 className="text-3xl md:text-4xl font-black text-[var(--p-primary)] mt-4 leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-lg text-[var(--p-text)]/70 mt-3 max-w-2xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
