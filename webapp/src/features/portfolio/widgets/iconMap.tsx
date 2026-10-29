import {
  Apple,
  Activity,
  Leaf,
  Heart,
  Brain,
  Dumbbell,
  Baby,
  Salad,
  Coffee,
  Utensils,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Apple,
  Activity,
  Leaf,
  Heart,
  Brain,
  Dumbbell,
  Baby,
  Salad,
  Coffee,
  Utensils,
};

export function getIcon(name: string): LucideIcon {
  return iconMap[name] || Activity;
}

export { iconMap };
