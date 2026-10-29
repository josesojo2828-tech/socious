import type { Palette } from "./types";

export const palettes: Palette[] = [
  {
    id: "oceanica",
    name: "Oceánica",
    icon: "🌊",
    colors: {
      primary: "#0EA5E9",
      secondary: "#0284C7",
      accent: "#7DD3FC",
      background: "#F0F9FF",
      text: "#0C4A6E",
    },
  },
  {
    id: "natural",
    name: "Natural",
    icon: "🌿",
    colors: {
      primary: "#10B981",
      secondary: "#059669",
      accent: "#6EE7B7",
      background: "#F0FDF4",
      text: "#064E3B",
    },
  },
  {
    id: "atardecer",
    name: "Atardecer",
    icon: "🌅",
    colors: {
      primary: "#F97316",
      secondary: "#EA580C",
      accent: "#FDBA74",
      background: "#FFF7ED",
      text: "#7C2D12",
    },
  },
  {
    id: "nocturna",
    name: "Nocturna",
    icon: "🌙",
    colors: {
      primary: "#8B5CF6",
      secondary: "#7C3AED",
      accent: "#C4B5FD",
      background: "#FAF5FF",
      text: "#4C1D95",
    },
  },
  {
    id: "floral",
    name: "Floral",
    icon: "🌸",
    colors: {
      primary: "#EC4899",
      secondary: "#DB2777",
      accent: "#F9A8D4",
      background: "#FDF2F8",
      text: "#831843",
    },
  },
  {
    id: "playa",
    name: "Playa",
    icon: "🏖️",
    colors: {
      primary: "#14B8A6",
      secondary: "#0D9488",
      accent: "#99F6E4",
      background: "#F0FDFA",
      text: "#115E59",
    },
  },
  {
    id: "bosque",
    name: "Bosque",
    icon: "🌲",
    colors: {
      primary: "#16A34A",
      secondary: "#15803D",
      accent: "#86EFAC",
      background: "#F0FDF4",
      text: "#14532D",
    },
  },
  {
    id: "fuego",
    name: "Fuego",
    icon: "🔥",
    colors: {
      primary: "#EF4444",
      secondary: "#DC2626",
      accent: "#FCA5A5",
      background: "#FEF2F2",
      text: "#7F1D1D",
    },
  },
  {
    id: "zafiro",
    name: "Zafiro",
    icon: "💎",
    colors: {
      primary: "#3B82F6",
      secondary: "#2563EB",
      accent: "#93C5FD",
      background: "#EFF6FF",
      text: "#1E3A5F",
    },
  },
  {
    id: "campo",
    name: "Campo",
    icon: "🌻",
    colors: {
      primary: "#EAB308",
      secondary: "#CA8A04",
      accent: "#FDE047",
      background: "#FEFCE8",
      text: "#713F12",
    },
  },
  {
    id: "durazno",
    name: "Durazno",
    icon: "🍑",
    colors: {
      primary: "#FB923C",
      secondary: "#F97316",
      accent: "#FED7AA",
      background: "#FFF7ED",
      text: "#9A3412",
    },
  },
  {
    id: "galaxia",
    name: "Galaxia",
    icon: "🌌",
    colors: {
      primary: "#6366F1",
      secondary: "#4F46E5",
      accent: "#A5B4FC",
      background: "#F5F3FF",
      text: "#312E81",
    },
  },
  {
    id: "clasica",
    name: "Clásica",
    icon: "⚪",
    colors: {
      primary: "#64748B",
      secondary: "#475569",
      accent: "#CBD5E1",
      background: "#F8FAFC",
      text: "#1E293B",
    },
  },
  {
    id: "zen",
    name: "Zen",
    icon: "🧘",
    colors: {
      primary: "#A8A29E",
      secondary: "#78716C",
      accent: "#D6D3D1",
      background: "#FAF9F7",
      text: "#44403C",
    },
  },
  {
    id: "clinic-medical",
    name: "Clínica Médica",
    icon: "🏥",
    colors: {
      primary: "#1E40AF",
      secondary: "#1E3A8A",
      accent: "#60A5FA",
      background: "#F0F9FF",
      text: "#172554",
    },
  },
  {
    id: "clinic-emerald",
    name: "Salud Esmeralda",
    icon: "🩺",
    colors: {
      primary: "#047857",
      secondary: "#065F46",
      accent: "#34D399",
      background: "#ECFDF5",
      text: "#022C22",
    },
  },
  {
    id: "clinic-indigo",
    name: "Centro Imperial",
    icon: "🏛️",
    colors: {
      primary: "#4338CA",
      secondary: "#3730A3",
      accent: "#818CF8",
      background: "#EEF2FF",
      text: "#1E1B4B",
    },
  },
];

export function getPalette(id: string): Palette | undefined {
  return palettes.find((p) => p.id === id);
}

export function getPaletteOrDefault(id: string): Palette {
  return getPalette(id) ?? palettes[0];
}
