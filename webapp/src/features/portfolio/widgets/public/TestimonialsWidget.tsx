import type { TestimonialsContent, Palette } from "../types";
import { SectionHeading } from "../ui/SectionHeading";
import { TestimonialCard } from "../ui/TestimonialCard";

interface TestimonialsWidgetProps {
  content: TestimonialsContent;
  palette: Palette;
}

export function TestimonialsWidget({ content, palette }: TestimonialsWidgetProps) {
  const title = content?.title;
  const items = content?.items ?? [];

  if (items.length === 0) return null;

  return (
    <>
      {title && <SectionHeading badge="Testimonios" title={title} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
        {items.map((item, idx) => (
          <TestimonialCard
            key={idx}
            quote={item.text}
            author={item.patientName}
            rating={item.rating}
            photoUrl={item.photoUrl}
          />
        ))}
      </div>
    </>
  );
}
