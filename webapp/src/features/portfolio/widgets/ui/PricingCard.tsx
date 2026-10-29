import { Check } from "lucide-react";
import { GradientButton } from "./GradientButton";

interface PricingCardProps {
  name: string;
  price: string;
  features: string[];
  ctaText: string;
  ctaLink?: string;
  featured?: boolean;
}

export function PricingCard({
  name,
  price,
  features,
  ctaText,
  ctaLink = "#",
  featured = false,
}: PricingCardProps) {
  return (
    <div
      className={`group relative bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 flex flex-col ${
        featured
          ? "ring-2 ring-[var(--p-primary)] shadow-xl md:scale-105 md:-translate-y-2"
          : "hover:-translate-y-1"
      }`}
    >
      {/* Featured badge */}
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span className="inline-block px-4 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-gradient-to-r from-[var(--p-primary)] to-[var(--p-secondary)] text-white shadow-lg">
            Más popular
          </span>
        </div>
      )}

      <div className={`p-6 md:p-8 flex flex-col flex-1 ${featured ? "pt-8" : ""}`}>
        <h3 className="text-xl font-bold text-[var(--p-primary)] mb-1">{name}</h3>

        <div className="mt-4 mb-6">
          <span className="text-4xl md:text-5xl font-black text-[var(--p-text)] tracking-tight">
            {price}
          </span>
        </div>

        {(features ?? []).length > 0 && (
          <ul className="space-y-3 flex-1">
            {(features ?? []).map((feature, fi) => (
              <li key={fi} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[var(--p-accent)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-[var(--p-primary)]" />
                </div>
                <span className="text-[var(--p-text)] text-sm md:text-base">{feature}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8">
          {featured ? (
            <GradientButton href={ctaLink} variant="primary" className="w-full text-center justify-center">
              {ctaText}
            </GradientButton>
          ) : (
            <GradientButton href={ctaLink} variant="outline" className="w-full text-center justify-center">
              {ctaText}
            </GradientButton>
          )}
        </div>
      </div>
    </div>
  );
}
