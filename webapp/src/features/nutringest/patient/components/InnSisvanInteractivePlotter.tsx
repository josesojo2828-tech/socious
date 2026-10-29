'use client';

import React, { useState, useRef } from 'react';
import { Target, AlertTriangle, Sparkles, ZoomIn, UserCheck, Calendar } from 'lucide-react';
import {
  InnSisvanChartKey,
  ChartType,
  PediatricAgeGroup,
  getSpecificInnSisvanChartPath,
  normalizeGender,
} from '../lib/inn-sisvan-zones';

interface InnSisvanInteractivePlotterProps {
  chartKey: InnSisvanChartKey;
  gender?: string;
  ageYears?: number;
  ageMonths?: number;
  weightKg?: number;
  heightCm?: number;
  chartType?: ChartType;
  ageGroupOverride?: PediatricAgeGroup;
  onAgeGroupChange?: (ageGroup: PediatricAgeGroup) => void;
}

interface CoordinateMap {
  xMinVal: number;
  xMaxVal: number;
  yMinVal: number;
  yMaxVal: number;
  leftPct: number;
  rightPct: number;
  topPct: number;
  bottomPct: number;
}

const SPECIFIC_COORDINATE_MAPS: Record<string, CoordinateMap> = {
  '/inn-sisvan/peso-talla-hembras.png': {
    xMinVal: 55,
    xMaxVal: 135,
    yMinVal: 0,
    yMaxVal: 50,
    leftPct: 6.8,
    rightPct: 92.8,
    topPct: 14.0,
    bottomPct: 93.2,
  },
  '/inn-sisvan/peso-talla-varones.png': {
    xMinVal: 55,
    xMaxVal: 145,
    yMinVal: 0,
    yMaxVal: 55,
    leftPct: 6.8,
    rightPct: 92.8,
    topPct: 14.0,
    bottomPct: 93.2,
  },
  '/inn-sisvan/peso-edad-varones-0-5.png': {
    xMinVal: 0,
    xMaxVal: 5,
    yMinVal: 0,
    yMaxVal: 30,
    leftPct: 6.8,
    rightPct: 92.8,
    topPct: 14.0,
    bottomPct: 93.2,
  },
  '/inn-sisvan/peso-edad-varones-2-18.png': {
    xMinVal: 2,
    xMaxVal: 18,
    yMinVal: 0,
    yMaxVal: 110,
    leftPct: 6.8,
    rightPct: 92.8,
    topPct: 14.0,
    bottomPct: 93.2,
  },
  '/inn-sisvan/peso-edad-hembras-0-5.png': {
    xMinVal: 0,
    xMaxVal: 5,
    yMinVal: 0,
    yMaxVal: 30,
    leftPct: 6.8,
    rightPct: 92.8,
    topPct: 14.0,
    bottomPct: 93.2,
  },
  '/inn-sisvan/peso-edad-hembras-2-18.png': {
    xMinVal: 2,
    xMaxVal: 18,
    yMinVal: 0,
    yMaxVal: 95,
    leftPct: 6.8,
    rightPct: 92.8,
    topPct: 14.0,
    bottomPct: 93.2,
  },
  '/inn-sisvan/talla-edad-hembras-0-5.png': {
    xMinVal: 0,
    xMaxVal: 5,
    yMinVal: 40,
    yMaxVal: 130,
    leftPct: 6.8,
    rightPct: 92.8,
    topPct: 14.0,
    bottomPct: 93.2,
  },
  '/inn-sisvan/talla-edad-hembras-2-18.png': {
    xMinVal: 2,
    xMaxVal: 18,
    yMinVal: 70,
    yMaxVal: 185,
    leftPct: 6.8,
    rightPct: 92.8,
    topPct: 14.0,
    bottomPct: 93.2,
  },
  '/inn-sisvan/talla-edad-varones-0-5.png': {
    xMinVal: 0,
    xMaxVal: 5,
    yMinVal: 40,
    yMaxVal: 130,
    leftPct: 6.8,
    rightPct: 92.8,
    topPct: 14.0,
    bottomPct: 93.2,
  },
  '/inn-sisvan/talla-edad-varones-2-18.png': {
    xMinVal: 2,
    xMaxVal: 18,
    yMinVal: 70,
    yMaxVal: 200,
    leftPct: 6.8,
    rightPct: 92.8,
    topPct: 14.0,
    bottomPct: 93.2,
  },
  '/inn-sisvan/imc-edad-hembras-10-19.png': {
    xMinVal: 10,
    xMaxVal: 20,
    yMinVal: 0,
    yMaxVal: 35,
    leftPct: 6.8,
    rightPct: 92.8,
    topPct: 14.0,
    bottomPct: 93.2,
  },
  '/inn-sisvan/imc-edad-varones-10-19.png': {
    xMinVal: 10,
    xMaxVal: 20,
    yMinVal: 0,
    yMaxVal: 35,
    leftPct: 6.8,
    rightPct: 92.8,
    topPct: 14.0,
    bottomPct: 93.2,
  },
};

export const InnSisvanInteractivePlotter: React.FC<InnSisvanInteractivePlotterProps> = ({
  chartKey,
  gender,
  ageYears,
  ageMonths,
  weightKg,
  heightCm,
  ageGroupOverride,
  onAgeGroupChange,
}) => {
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<PediatricAgeGroup | undefined>(ageGroupOverride);

  const effectiveAgeYears = ageYears ?? (ageMonths != null ? ageMonths / 12 : undefined);

  const activeAgeGroup = selectedAgeGroup ?? ageGroupOverride;
  const { path: chartPath, resolvedAgeGroup, isFemale } = getSpecificInnSisvanChartPath({
    chartKey,
    gender,
    ageYears: effectiveAgeYears,
    ageGroupOverride: activeAgeGroup,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [showZoom, setShowZoom] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0, relX: 50, relY: 50 });

  if (!chartPath) {
    return (
      <div className="bg-base-100 border border-base-300 rounded-xl p-4 text-center">
        <p className="text-xs text-base-content/60 flex items-center justify-center gap-2 py-4">
          <AlertTriangle size={16} className="shrink-0 text-amber-500" />
          La gráfica {chartKey} no está disponible para este perfil.
        </p>
      </div>
    );
  }

  let xVal: number | undefined;
  let yVal: number | undefined;
  let xLabel = '';
  let yLabel = '';

  const isImcZeroToFive = chartKey === 'IMC_EDAD' && resolvedAgeGroup === '0-5';

  if (chartKey === 'PESO_TALLA' || isImcZeroToFive) {
    xVal = heightCm;
    xLabel = `Talla: ${heightCm ?? '—'} cm`;
    yVal = weightKg;
    yLabel = `Peso: ${weightKg ?? '—'} kg`;
  } else if (chartKey === 'TALLA_EDAD') {
    xVal = effectiveAgeYears;
    xLabel = ageMonths != null ? `Edad: ${ageMonths} meses (${effectiveAgeYears?.toFixed(1) ?? '—'} años)` : `Edad: ${effectiveAgeYears ?? '—'} años`;
    yVal = heightCm;
    yLabel = `Talla: ${heightCm ?? '—'} cm`;
  } else if (chartKey === 'PESO_EDAD') {
    xVal = effectiveAgeYears;
    xLabel = ageMonths != null ? `Edad: ${ageMonths} meses (${effectiveAgeYears?.toFixed(1) ?? '—'} años)` : `Edad: ${effectiveAgeYears ?? '—'} años`;
    yVal = weightKg;
    yLabel = `Peso: ${weightKg ?? '—'} kg`;
  } else if (chartKey === 'IMC_EDAD') {
    xVal = effectiveAgeYears;
    xLabel = ageMonths != null ? `Edad: ${ageMonths} meses (${effectiveAgeYears?.toFixed(1) ?? '—'} años)` : `Edad: ${effectiveAgeYears ?? '—'} años`;
    if (weightKg && heightCm && heightCm > 0) {
      const heightM = heightCm / 100;
      yVal = Number((weightKg / (heightM * heightM)).toFixed(2));
      yLabel = `IMC: ${yVal} kg/m²`;
    }
  }

  const coordConfig = SPECIFIC_COORDINATE_MAPS[chartPath] || SPECIFIC_COORDINATE_MAPS['/inn-sisvan/peso-talla-varones.png'];

  let pointLeftPct: number | null = null;
  let pointTopPct: number | null = null;

  if (xVal !== undefined && yVal !== undefined && xVal >= coordConfig.xMinVal && xVal <= coordConfig.xMaxVal) {
    const xRatio = (xVal - coordConfig.xMinVal) / (coordConfig.xMaxVal - coordConfig.xMinVal);
    pointLeftPct = coordConfig.leftPct + xRatio * (coordConfig.rightPct - coordConfig.leftPct);

    const clampedY = Math.max(coordConfig.yMinVal, Math.min(coordConfig.yMaxVal, yVal));
    const yRatio = (clampedY - coordConfig.yMinVal) / (coordConfig.yMaxVal - coordConfig.yMinVal);
    pointTopPct = coordConfig.bottomPct - yRatio * (coordConfig.bottomPct - coordConfig.topPct);
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const relX = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const relY = Math.max(0, Math.min(100, (y / rect.height) * 100));

    setZoomPos({ x, y, relX, relY });
  };

  const handleSelectAgeGroup = (group: PediatricAgeGroup) => {
    setSelectedAgeGroup(group);
    if (onAgeGroupChange) onAgeGroupChange(group);
  };

  return (
    <div className="space-y-3">
      {/* Selector de Filtros de Género y Edad Activados */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-base-100 p-3 rounded-xl border border-base-300 shadow-sm">
        <div className="flex items-center gap-2">
          {/* Badge de Género con Iconografía y Color Oficial */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              isFemale
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-sky-50 text-sky-700 border border-sky-200'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            {isFemale ? 'Filtro: Hembra (Rosado)' : 'Filtro: Varón (Azul)'}
          </span>

          {/* Selector/Badge de Rango de Edad */}
          {chartKey !== 'PESO_TALLA' && chartKey !== 'IMC_EDAD' && (
            <div className="inline-flex items-center bg-base-200 p-0.5 rounded-lg border border-base-300">
              <button
                type="button"
                onClick={() => handleSelectAgeGroup('0-5')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  resolvedAgeGroup === '0-5'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-base-content/70 hover:text-base-content'
                }`}
              >
                0–5 Años
              </button>
              <button
                type="button"
                onClick={() => handleSelectAgeGroup('2-18')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  resolvedAgeGroup === '2-18'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-base-content/70 hover:text-base-content'
                }`}
              >
                2–18 Años
              </button>
            </div>
          )}

          {chartKey === 'IMC_EDAD' && (
            <div className="inline-flex items-center bg-base-200 p-0.5 rounded-lg border border-base-300">
              <button
                type="button"
                onClick={() => handleSelectAgeGroup('0-5')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  resolvedAgeGroup === '0-5'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-base-content/70 hover:text-base-content'
                }`}
                title="Curva Peso para la Talla (0 a 5 años, estándar INN-SISVAN / OMS)"
              >
                0–5 Años (P/T)
              </button>
              <button
                type="button"
                onClick={() => handleSelectAgeGroup('10-19')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  resolvedAgeGroup === '10-19'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-base-content/70 hover:text-base-content'
                }`}
                title="Curva oficial INN-SISVAN de 10 a 19 años (IMC para la Edad)"
              >
                10–19 Años (IMC)
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-emerald-600" />
          <span className="text-xs font-bold text-base-content/90">Valores:</span>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {xLabel || 'Sin datos'}
          </span>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {yLabel || 'Sin datos'}
          </span>
        </div>
      </div>

      {/* Visor de Imagen con Overlay de Punto Micrométrico y Lupa de Zoom Aumentada */}
      <div className="relative bg-base-100 border border-base-300 rounded-xl p-3 flex justify-center overflow-hidden shadow-sm">
        <div
          ref={containerRef}
          onMouseEnter={() => setShowZoom(true)}
          onMouseLeave={() => setShowZoom(false)}
          onMouseMove={handleMouseMove}
          className="relative inline-block max-w-full cursor-crosshair group"
        >
          <img
            src={chartPath}
            alt={`Gráfica INN-SISVAN ${chartKey}`}
            className="max-w-full h-auto max-h-[650px] object-contain rounded-lg block shadow-inner"
          />

          {/* Marcador Micrométrico de Precisión Quirúrgica (Solo Punto) */}
          {pointLeftPct !== null && pointTopPct !== null && (
            <div
              key="inn-sisvan-point-marker"
              className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-out z-10"
              style={{ left: `${pointLeftPct}%`, top: `${pointTopPct}%` }}
            >
              <span className="relative block h-3.5 w-3.5 rounded-full bg-rose-600 border-2 border-base-100 shadow-md ring-2 ring-rose-500/50 animate-pulse" />
            </div>
          )}

          {/* Lupa / Zoom Dinámico Magnificado 3.7x */}
          {showZoom && (
            <div
              key="inn-sisvan-zoom-lens"
              className="pointer-events-none absolute h-56 w-56 rounded-full border-2 border-base-100 overflow-hidden shadow-2xl z-30 ring-4 ring-emerald-500/40 bg-base-100"
              style={{
                top: `${zoomPos.y - 112}px`,
                left: `${zoomPos.x - 112}px`,
              }}
            >
              <div
                className="absolute w-full h-full"
                style={{
                  transformOrigin: `${zoomPos.relX}% ${zoomPos.relY}%`,
                  transform: `translate(${50 - zoomPos.relX}%, ${50 - zoomPos.relY}%) scale(3.7)`,
                }}
              >
                <img
                  src={chartPath}
                  alt="Zoom INN-SISVAN"
                  className="w-full h-full object-contain block"
                />
                {pointLeftPct !== null && pointTopPct !== null && (
                  <div
                    key="inn-sisvan-zoom-point"
                    className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${pointLeftPct}%`, top: `${pointTopPct}%` }}
                  >
                    <span className="relative block h-1.5 w-1.5 rounded-full bg-rose-600 border border-base-100 shadow-sm ring-1 ring-rose-500" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InnSisvanInteractivePlotter;

