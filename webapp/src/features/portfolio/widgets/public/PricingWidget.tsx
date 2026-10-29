import type { PricingContent, Palette } from "../types";
import { SectionHeading } from "../ui/SectionHeading";
import { PricingCard } from "../ui/PricingCard";

interface PricingWidgetProps {
  content: PricingContent;
  palette: Palette;
}

export function PricingWidget({ content, palette }: PricingWidgetProps) {
  const title = content?.title;
  const plans = content?.plans ?? [];

  if (plans.length === 0) return null;

  const featuredIndex = plans.length === 3 ? 1 : -1;

  return (
    <>
      {title && <SectionHeading badge="Planes" title={title} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 items-start max-w-5xl mx-auto">
        {plans.map((plan, idx) => (
          <PricingCard
            key={idx}
            name={plan.name}
            price={plan.price}
            features={plan.features}
            ctaText={plan.ctaText || "Contratar"}
            ctaLink={plan.ctaLink}
            featured={idx === featuredIndex}
          />
        ))}
      </div>
    </>
  );
}
