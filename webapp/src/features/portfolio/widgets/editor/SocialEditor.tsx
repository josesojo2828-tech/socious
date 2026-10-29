"use client";

import { Input } from "@/shared/components/atoms/Input";
import { Toggle } from "@/shared/components/atoms/Toggle";
import { Instagram, Twitter, Linkedin, Youtube, Music2, Facebook, Globe } from "lucide-react";
import type { SocialContent, SocialPlatform, SocialPlatformName } from "@/features/portfolio/widgets/types";

interface SocialEditorProps {
  content: SocialContent;
  onChange: (content: SocialContent) => void;
}

const platformConfig: Record<SocialPlatformName, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  instagram: { label: "Instagram", icon: Instagram },
  twitter: { label: "Twitter / X", icon: Twitter },
  linkedin: { label: "LinkedIn", icon: Linkedin },
  youtube: { label: "YouTube", icon: Youtube },
  tiktok: { label: "TikTok", icon: Music2 },
  facebook: { label: "Facebook", icon: Facebook },
  website: { label: "Sitio web", icon: Globe },
};

export function SocialEditor({ content, onChange }: SocialEditorProps) {
  const updatePlatform = (platform: SocialPlatformName, field: keyof SocialPlatform, value: any) => {
    const platforms = content.platforms.map((p) =>
      p.platform === platform ? { ...p, [field]: value } : p
    );
    if (!platforms.find((p) => p.platform === platform)) {
      platforms.push({ platform, url: "", enabled: true });
    }
    onChange({ ...content, platforms });
  };

  const getPlatform = (platform: SocialPlatformName): SocialPlatform => {
    return content.platforms.find((p) => p.platform === platform) ?? { platform, url: "", enabled: false };
  };

  const allPlatforms: SocialPlatformName[] = ["instagram", "twitter", "linkedin", "youtube", "tiktok", "facebook", "website"];

  return (
    <div className="space-y-4">
      {allPlatforms.map((platform) => {
        const p = getPlatform(platform);
        const config = platformConfig[platform];
        const IconComp = config.icon;
        return (
          <div key={platform} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 pt-1.5 min-w-0 flex-1">
              <IconComp className="w-4 h-4 shrink-0 text-slate-500" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-600">{config.label}</span>
                  <Toggle checked={p.enabled} onChange={(e) => updatePlatform(platform, "enabled", e.target.checked)} variant="success" size="xs" />
                </div>
                {p.enabled && (
                  <Input value={p.url} onChange={(e) => updatePlatform(platform, "url", e.target.value)} placeholder={`https://${platform}.com/tu-usuario`} size="sm" />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
