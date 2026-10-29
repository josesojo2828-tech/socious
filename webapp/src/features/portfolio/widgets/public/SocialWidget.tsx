import { Globe, Instagram, Linkedin, Youtube, Twitter, Music2, Facebook } from "lucide-react";
import type { SocialContent, Palette } from "../types";
import { SocialButton } from "../ui/SocialButton";

interface SocialWidgetProps {
  content: SocialContent;
  palette: Palette;
}

const platformMeta: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; brandColor: string }> = {
  instagram: { label: "Instagram", icon: Instagram, brandColor: "#E4405F" },
  linkedin: { label: "LinkedIn", icon: Linkedin, brandColor: "#0A66C2" },
  youtube: { label: "YouTube", icon: Youtube, brandColor: "#FF0000" },
  twitter: { label: "Twitter / X", icon: Twitter, brandColor: "#000000" },
  tiktok: { label: "TikTok", icon: Music2, brandColor: "#000000" },
  facebook: { label: "Facebook", icon: Facebook, brandColor: "#1877F2" },
  website: { label: "Sitio web", icon: Globe, brandColor: "#64748B" },
};

export function SocialWidget({ content, palette }: SocialWidgetProps) {
  const platforms = content?.platforms ?? [];
  const enabled = platforms.filter((p) => p?.enabled && p?.url);

  if (enabled.length === 0) return null;

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-3 py-2">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
        Redes Sociales
      </span>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {enabled.map((p, idx) => {
          const meta = platformMeta[p.platform];
          if (!meta) return null;
          const Icon = meta.icon;
          return (
            <a
              key={idx}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              title={meta.label}
              className="w-11 h-11 rounded-2xl bg-white border border-slate-200/80 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.05)] flex items-center justify-center text-slate-700 hover:text-[var(--p-primary)] hover:border-[var(--p-primary)]/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
            >
              <Icon className="w-5 h-5" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
