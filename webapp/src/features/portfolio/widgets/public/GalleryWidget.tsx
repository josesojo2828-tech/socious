import type { GalleryContent, Palette } from "../types";
import { SectionHeading } from "../ui/SectionHeading";

interface GalleryWidgetProps {
  content: GalleryContent;
  palette: Palette;
}

export function GalleryWidget({ content, palette }: GalleryWidgetProps) {
  const title = content?.title;
  const images = content?.images ?? [];

  if (images.length === 0) return null;

  return (
    <>
      {title && <SectionHeading badge="Galería" title={title} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {images.map((img, idx) => (
          <div
            key={idx}
            className="group relative overflow-hidden rounded-2xl bg-white shadow-md hover:shadow-2xl transition-all duration-300"
          >
            <div className="relative overflow-hidden aspect-[4/3]">
              <img
                src={img.url}
                alt={img.caption || `Galería ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {img.caption && (
                  <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                    <p className="text-white font-medium text-sm md:text-base leading-snug">
                      {img.caption}
                    </p>
                  </div>
                )}
              </div>
            </div>
            {img.caption && (
              <div className="p-3 md:p-4 group-hover:hidden transition-all">
                <p className="text-xs text-[var(--p-text)]/60 font-medium truncate">
                  {img.caption}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
