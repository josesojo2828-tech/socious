"use client";

import { palettes } from "@/features/portfolio/widgets/palettes";

interface PaletteSelectorProps {
  selected: string;
  onSelect: (id: string) => void;
}

export function PaletteSelector({ selected, onSelect }: PaletteSelectorProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      {palettes.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelect(p.id)}
          className={`
            flex-shrink-0 flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all cursor-pointer
            ${selected === p.id
              ? "border-emerald-500 bg-emerald-50 shadow-sm"
              : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
            }
          `}
        >
          <span className="text-lg">{p.icon}</span>
          <span className="text-[10px] font-semibold text-slate-600 whitespace-nowrap">{p.name}</span>
          <div className="flex gap-0.5">
            {Object.values(p.colors).map((color, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full border border-white/50"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}
