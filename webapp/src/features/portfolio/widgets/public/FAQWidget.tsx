import { Plus } from "lucide-react";
import type { FAQContent, Palette } from "../types";
import { SectionHeading } from "../ui/SectionHeading";

interface FAQWidgetProps {
  content: FAQContent;
  palette: Palette;
}

export function FAQWidget({ content, palette }: FAQWidgetProps) {
  const title = content?.title;
  const items = content?.items ?? [];

  if (items.length === 0) return null;

  return (
    <>
      {title && <SectionHeading badge="FAQ" title={title} />}
      <div className="max-w-3xl mx-auto space-y-3">
        {items.map((item, idx) => (
          <details
            key={idx}
            className="group bg-white rounded-2xl shadow-sm border border-[var(--p-accent)]/20 overflow-hidden transition-all duration-200 open:shadow-md"
          >
            <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none font-semibold text-[var(--p-primary)] hover:bg-[var(--p-accent)]/5 transition-colors">
              <span className="text-sm md:text-base">{item.question}</span>
              <span className="flex-shrink-0 text-[var(--p-accent)] transition-transform duration-300 group-open:rotate-45">
                <Plus className="w-5 h-5" />
              </span>
            </summary>
            <div className="px-6 pb-6 pt-2 border-t border-[var(--p-accent)]/10">
              <p className="text-[var(--p-text)] leading-relaxed text-sm md:text-base whitespace-pre-line">
                {item.answer}
              </p>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
