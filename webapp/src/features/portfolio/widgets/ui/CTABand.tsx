import { Sparkles, ArrowRight } from "lucide-react";

interface CTABandProps {
  title: string;
  description?: string;
  buttonText: string;
  buttonLink: string;
}

export function CTABand({ title, description, buttonText, buttonLink }: CTABandProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--p-primary)] to-[var(--p-secondary)] p-8 md:p-12 lg:p-16 shadow-2xl">
      {/* Decorations */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-5"
        style={{
          backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm mb-6">
          <Sparkles className="w-8 h-8 text-white" />
        </div>

        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight">
          {title}
        </h2>

        {description && (
          <p className="text-lg md:text-xl text-white/80 mt-4 leading-relaxed max-w-2xl mx-auto">
            {description}
          </p>
        )}

        <div className="mt-8">
          <a
            href={buttonLink}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-[var(--p-primary)] font-bold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:scale-[0.98] transition-all group"
          >
            {buttonText}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </div>
  );
}
