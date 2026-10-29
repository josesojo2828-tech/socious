"use client";

import { useMemo } from "react";

interface CommunityNutritionalRadarProps {
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
}

export function CommunityNutritionalRadar({
  kcal,
  protein,
  carbs,
  fats,
}: CommunityNutritionalRadarProps) {
  const stats = useMemo(() => {
    const pKcal = protein * 4;
    const cKcal = carbs * 4;
    const fKcal = fats * 9;
    const totalMacroKcal = pKcal + cKcal + fKcal || 1;

    const pRatio = Math.min(100, Math.round((pKcal / totalMacroKcal) * 100));
    const cRatio = Math.min(100, Math.round((cKcal / totalMacroKcal) * 100));
    const fRatio = Math.min(100, Math.round((fKcal / totalMacroKcal) * 100));
    // Caloric scale normalized to max 2500 kcal baseline (e.g. 700 kcal -> ~70%)
    const kcalScore = Math.min(100, Math.round((kcal / 1000) * 100));

    return [
      { label: "Proteína", value: pRatio, text: `${Math.round(protein)}g (${pRatio}%)`, color: "#10b981" },
      { label: "Carbohidratos", value: cRatio, text: `${Math.round(carbs)}g (${cRatio}%)`, color: "#f59e0b" },
      { label: "Grasas", value: fRatio, text: `${Math.round(fats)}g (${fRatio}%)`, color: "#6366f1" },
      { label: "Densidad Kcal", value: kcalScore, text: `${Math.round(kcal)} kcal`, color: "#06b6d4" },
    ];
  }, [kcal, protein, carbs, fats]);

  // SVG Radar Dimensions
  const size = 220;
  const center = size / 2;
  const radius = 70;
  const numAxes = stats.length;

  // Calculate points along axes
  const getCoordinates = (index: number, val: number) => {
    // Angle starting at -PI/2 (top)
    const angle = (Math.PI * 2 * index) / numAxes - Math.PI / 2;
    const r = (radius * val) / 100;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle };
  };

  // Polygon points for radar dataset
  const polygonPoints = stats
    .map((s, i) => {
      const { x, y } = getCoordinates(i, s.value);
      return `${x},${y}`;
    })
    .join(" ");

  // Concentric background grid polygons (at 25%, 50%, 75%, 100%)
  const gridPolygons = [0.25, 0.5, 0.75, 1.0].map((level) => {
    return stats
      .map((_, i) => {
        const { x, y } = getCoordinates(i, level * 100);
        return `${x},${y}`;
      })
      .join(" ");
  });

  return (
    <div className="bg-slate-900/90 text-white p-4 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden flex flex-col items-center">
      {/* Subtle Glow Background */}
      <div className="absolute -top-12 -left-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 self-start flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        Distribución Nutricional
      </h4>

      <div className="relative w-[220px] h-[220px] flex items-center justify-center my-1">
        <svg width={size} height={size} className="overflow-visible">
          <defs>
            <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.25" />
            </radialGradient>
          </defs>

          {/* Grid Polygons */}
          {gridPolygons.map((pts, idx) => (
            <polygon
              key={idx}
              points={pts}
              fill="none"
              stroke="#334155"
              strokeDasharray={idx === 3 ? "0" : "2 2"}
              strokeWidth={idx === 3 ? "1.5" : "1"}
            />
          ))}

          {/* Axes Lines */}
          {stats.map((_, i) => {
            const { x, y } = getCoordinates(i, 100);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="#334155"
                strokeWidth="1"
              />
            );
          })}

          {/* Radar Data Polygon */}
          <polygon
            points={polygonPoints}
            fill="url(#radarGradient)"
            stroke="#10b981"
            strokeWidth="2.5"
            className="transition-all duration-500 ease-out"
          />

          {/* Data Points */}
          {stats.map((s, i) => {
            const { x, y } = getCoordinates(i, s.value);
            return (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r="4.5"
                  fill={s.color}
                  stroke="#0f172a"
                  strokeWidth="2"
                  className="transition-all duration-500"
                />
              </g>
            );
          })}

          {/* Labels */}
          {stats.map((s, i) => {
            const { x, y, angle } = getCoordinates(i, 118);
            let textAnchor: "middle" | "start" | "end" = "middle";
            if (Math.abs(Math.cos(angle)) > 0.3) {
              textAnchor = Math.cos(angle) > 0 ? "start" : "end";
            }

            return (
              <text
                key={i}
                x={x}
                y={y + 4}
                textAnchor={textAnchor}
                className="text-[10px] font-semibold fill-slate-300 tracking-tight"
              >
                {s.label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Legend Badges */}
      <div className="grid grid-cols-2 gap-2 w-full mt-2 pt-3 border-t border-slate-800/80">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-700/50">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-slate-400 truncate leading-none">{s.label}</span>
              <span className="text-xs font-bold text-slate-200 leading-tight truncate">{s.text}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
