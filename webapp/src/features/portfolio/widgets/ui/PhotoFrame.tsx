interface PhotoFrameProps {
  src: string;
  alt: string;
  variant?: "circular" | "rounded" | "polaroid";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function PhotoFrame({
  src,
  alt,
  variant = "circular",
  size = "lg",
  className = "",
}: PhotoFrameProps) {
  const sizeStyles = {
    sm: "w-16 h-16",
    md: "w-24 h-24 sm:w-28 sm:h-28",
    lg: "w-32 h-32 sm:w-36 sm:h-36",
    xl: "w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44",
  };

  if (variant === "polaroid") {
    return (
      <div className={`inline-block p-3 bg-white rounded-2xl shadow-xl rotate-1 hover:rotate-0 transition-transform duration-300 ${className}`}>
        <img
          src={src}
          alt={alt}
          className={`w-full ${sizeStyles[size]} object-cover rounded-xl`}
        />
      </div>
    );
  }

  const roundClass = variant === "circular" ? "rounded-full" : "rounded-2xl";

  return (
    <div className={`relative inline-block ${roundClass} ${sizeStyles[size]} ${className}`}>
      {/* Soft Glow layer */}
      <div
        className={`absolute inset-0 ${roundClass} bg-gradient-to-br from-[var(--p-primary)] to-[var(--p-accent)] opacity-25 blur-md -z-10`}
      />
      {/* Image with crisp white ring */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full ${roundClass} object-cover ring-4 ring-white shadow-2xl bg-white`}
      />
    </div>
  );
}
