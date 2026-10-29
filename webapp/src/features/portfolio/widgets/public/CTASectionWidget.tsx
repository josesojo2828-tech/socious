import type { CTAContent, Palette } from "../types";
import { CTABand } from "../ui/CTABand";

interface CTASectionWidgetProps {
  content: CTAContent;
  palette: Palette;
}

export function CTASectionWidget({ content, palette }: CTASectionWidgetProps) {
  const { title, description, buttonText, buttonLink } = content;

  if (!title || !buttonText || !buttonLink) return null;

  return (
    <CTABand
      title={title}
      description={description}
      buttonText={buttonText}
      buttonLink={buttonLink}
    />
  );
}
