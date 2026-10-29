import { Quote } from "lucide-react";
import type { AboutContent, Palette } from "../types";
import { SectionHeading } from "../ui/SectionHeading";
import { PhotoFrame } from "../ui/PhotoFrame";

interface AboutWidgetProps {
  content: AboutContent;
  palette: Palette;
}

export function AboutWidget({ content, palette }: AboutWidgetProps) {
  const { photoUrl, biography, philosophy } = content;

  if (!biography) return null;

  return (
    <>
      <SectionHeading badge="Sobre mí" title="Conoce más sobre mi trabajo" />

      <div className="flex flex-col md:flex-row gap-8 md:gap-16 items-start">
        {/* Photo with decorative frame */}
        {photoUrl && (
          <div className="w-full md:w-1/3 flex-shrink-0">
            <div className="relative">
              <div className="absolute -top-3 -left-3 w-full h-full rounded-2xl bg-gradient-to-br from-[var(--p-primary)]/20 to-[var(--p-accent)]/20" />
              <div className="absolute -bottom-3 -right-3 w-full h-full rounded-2xl bg-gradient-to-br from-[var(--p-secondary)]/10 to-[var(--p-primary)]/10" />
              <img
                src={photoUrl}
                alt="Sobre mí"
                className="relative w-full aspect-[4/5] object-cover rounded-2xl shadow-xl ring-4 ring-white"
              />
            </div>
          </div>
        )}

        <div className={`${photoUrl ? "md:w-2/3" : "w-full"}`}>
          <p className="text-lg md:text-xl text-[var(--p-text)] leading-relaxed font-medium whitespace-pre-line">
            {biography}
          </p>

          {philosophy && (
            <div className="relative mt-10 pl-8 md:pl-12 border-l-4 border-[var(--p-primary)]">
              <div className="absolute -top-2 -left-3 md:-left-4 text-[var(--p-primary)]/20">
                <Quote className="w-8 h-8 md:w-10 md:h-10" />
              </div>
              <p className="text-lg md:text-xl text-[var(--p-secondary)] italic leading-relaxed font-medium">
                &ldquo;{philosophy}&rdquo;
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
