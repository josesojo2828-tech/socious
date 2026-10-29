import { Star, Quote } from "lucide-react";

interface TestimonialCardProps {
  quote: string;
  author: string;
  rating?: number;
  photoUrl?: string;
}

export function TestimonialCard({ quote, author, rating, photoUrl }: TestimonialCardProps) {
  return (
    <div className="group relative bg-white rounded-2xl p-6 md:p-8 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
      {/* Decorative quote */}
      <div className="absolute top-4 right-4 text-[var(--p-primary)]/10">
        <Quote className="w-12 h-12 md:w-16 md:h-16" />
      </div>

      {/* Author */}
      <div className="flex items-center gap-4 mb-5">
        {photoUrl ? (
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--p-primary)] to-[var(--p-accent)] opacity-30 blur-sm" />
            <img
              src={photoUrl}
              alt={author}
              className="relative w-14 h-14 rounded-full object-cover ring-2 ring-white shadow-md"
            />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--p-primary)]/20 to-[var(--p-accent)]/20 flex items-center justify-center shadow-md">
            <span className="text-lg font-bold text-[var(--p-primary)]">
              {author.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div>
          <p className="font-bold text-[var(--p-primary)] text-sm md:text-base">{author}</p>
          {rating && (
            <div className="flex gap-0.5 mt-1">
              {Array.from({ length: rating }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-current text-yellow-400" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quote */}
      <p className="text-[var(--p-text)] leading-relaxed italic relative z-10">
        &ldquo;{quote}&rdquo;
      </p>

      {/* Hover accent */}
      <div className="mt-6 h-0.5 w-12 bg-gradient-to-r from-[var(--p-primary)] to-[var(--p-accent)] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
}
