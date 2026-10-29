import React, { FC, useState } from 'react';
import { useAnthropometryMetrics } from '../hooks/useMetricsAnthropometry';
import { MultyLineChart } from '@/shared/components/molecules/Charts/MultiLineChart';
import { Line, Doughnut } from 'react-chartjs-2';
import { Activity, PieChart, Grid, Info, TrendingUp } from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement
);

interface Props {
    patientId: string;
    birthDate?: string;
}

type TabType = 'history' | 'fraction' | 'somatochart';

export const PatientAnthropometricsAnalytics: FC<Props> = ({ patientId, birthDate }) => {
    const { metrics, isLoading } = useAnthropometryMetrics(patientId);
    const [activeTab, setActiveTab] = useState<TabType>('history');

    if (isLoading || !metrics) {
        return (
            <div className="h-96 bg-base-200 rounded-2xl animate-pulse border border-base-200 mb-8 flex items-center justify-center">
                <span className="text-base-content/50 text-sm">Cargando análisis...</span>
            </div>
        );
    }

    const totalMeasurements = metrics.labels.length;

    if (totalMeasurements === 0) {
        return (
            <div className="h-64 bg-base-200/50 rounded-2xl border border-dashed border-base-300 mb-8 flex flex-col items-center justify-center text-base-content/50 p-6 text-center">
                <Activity size={32} className="mb-2 text-base-content/40" />
                <p className="text-sm font-semibold">Sin mediciones registradas</p>
                <p className="text-xs text-base-content/50 mt-1">Registrá la primera medición del paciente para habilitar los gráficos y análisis.</p>
            </div>
        );
    }

    // Obtener los datos más recientes para el fraccionamiento y somatotipo
    const latestIndex = 0; // en el historial, usualmente el primero de la lista devuelto por getMetrics es el más antiguo o el más nuevo?
    // En AnthropometryService.getMetrics:
    // const history = await this.prisma.anthropometry.findMany({ where: { patientId }, orderBy: { date: 'asc' } })
    // Así que 'asc' significa que el último de la lista (index = metrics.labels.length - 1) es el más reciente!
    const latestIdx = totalMeasurements - 1;

    // 1. Fraccionamiento de Masa (Kerr)
    const latestWeight = metrics.datasets.weight[latestIdx] || 0;
    const latestAdipose = metrics.datasets.adiposeMass?.[latestIdx] || 0;
    const latestMuscle = metrics.datasets.muscleMass?.[latestIdx] || 0;
    const latestBone = metrics.datasets.boneMass?.[latestIdx] || 0;
    const latestResidualRaw = metrics.datasets.residualMass?.[latestIdx] || 0;

    // Kerr/Rocha/Lee están calibrados en adultos: para menores de 18 el server
    // omite el residual y esta vista no debe mostrar un 0 engañoso.
    const isPediatric = (() => {
        if (!birthDate) return false;
        const today = new Date();
        const birth = new Date(birthDate);
        if (isNaN(birth.getTime())) return false;
        let a = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
        return a > 0 && a < 18;
    })();
    const latestResidual = isPediatric ? 0 : latestResidualRaw;

    const hasFractionation = latestAdipose > 0 && latestMuscle > 0 && latestBone > 0;

    // 2. Somatotipo (Heath-Carter)
    const latestEndo = metrics.datasets.endomorphy?.[latestIdx] || 0;
    const latestMeso = metrics.datasets.mesomorphy?.[latestIdx] || 0;
    const latestEcto = metrics.datasets.ectomorphy?.[latestIdx] || 0;

    const hasSomatotype = latestEndo > 0 && latestMeso > 0 && latestEcto > 0;

    // Construir los puntos de la Somatocarta para todo el historial
    const somatoPoints = metrics.labels.map((label, idx) => {
        const endo = metrics.datasets.endomorphy?.[idx] || 0;
        const meso = metrics.datasets.mesomorphy?.[idx] || 0;
        const ecto = metrics.datasets.ectomorphy?.[idx] || 0;
        if (endo > 0 && meso > 0 && ecto > 0) {
            return {
                x: ecto - endo,
                y: 2 * meso - (endo + ecto),
                date: label,
                endo,
                meso,
                ecto
            };
        }
        return null;
    }).filter(pt => pt !== null) as any[];

    // Configuración para el Doughnut de Fraccionamiento
    // En pediatría se omite la porción residual (paridad con el reporte).
    const doughnutData = isPediatric
        ? {
            labels: ['Masa Adiposa (kg)', 'Masa Muscular (kg)', 'Masa Ósea (kg)'],
            datasets: [
                {
                    data: [latestAdipose, latestMuscle, latestBone],
                    backgroundColor: [
                        'rgba(245, 158, 11, 0.8)',  // Amber
                        'rgba(16, 185, 129, 0.8)',  // Emerald
                        'rgba(234, 179, 8, 0.8)'    // Yellow
                    ],
                    borderColor: [
                        '#f59e0b',
                        '#10b981',
                        '#eab308'
                    ],
                    borderWidth: 2
                }
            ]
        }
        : {
            labels: ['Masa Adiposa (kg)', 'Masa Muscular (kg)', 'Masa Ósea (kg)', 'Masa Residual (kg)'],
            datasets: [
                {
                    data: [latestAdipose, latestMuscle, latestBone, latestResidual],
                    backgroundColor: [
                        'rgba(245, 158, 11, 0.8)',  // Amber
                        'rgba(16, 185, 129, 0.8)',  // Emerald
                        'rgba(234, 179, 8, 0.8)',   // Yellow
                        'rgba(244, 63, 94, 0.8)'    // Rose
                    ],
                    borderColor: [
                        '#f59e0b',
                        '#10b981',
                        '#eab308',
                        '#f43f5e'
                    ],
                    borderWidth: 2
                }
            ]
        };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right' as const,
                labels: {
                    boxWidth: 12,
                    font: { size: 11, family: 'Inter' },
                    color: '#374151'
                }
            },
            tooltip: {
                backgroundColor: '#1f2937',
                padding: 10,
                cornerRadius: 8,
                callbacks: {
                    label: function (context: any) {
                        const val = context.raw || 0;
                        const pct = ((val / latestWeight) * 100).toFixed(1);
                        return ` ${context.label.split(' ')[0]}: ${val.toFixed(2)} kg (${pct}%)`;
                    }
                }
            }
        },
        cutout: '60%'
    };

    // Configuración para la Somatocarta
    const somatochartData = {
        datasets: [
            {
                label: 'Evolución Somatotipo',
                data: somatoPoints.map(pt => ({ x: pt.x, y: pt.y })),
                borderColor: '#059669',
                borderWidth: 2,
                showLine: true, // Conectar puntos históricamente
                segment: {
                    borderDash: (ctx: any) => ctx.p0.parsed.x === undefined ? [6, 6] : undefined
                },
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                pointBackgroundColor: somatoPoints.map((_, idx) => idx === somatoPoints.length - 1 ? '#ef4444' : '#10b981'),
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: somatoPoints.map((_, idx) => idx === somatoPoints.length - 1 ? 7 : 5),
                pointHoverRadius: 8,
                tension: 0.2
            }
        ]
    };

    const somatochartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: 'linear' as const,
                position: 'bottom' as const,
                min: -8,
                max: 8,
                title: {
                    display: true,
                    text: 'Ectomorfismo - Endomorfismo (X)',
                    font: { size: 10, weight: 'bold' as const, family: 'Inter' },
                    color: '#6b7280'
                },
                grid: {
                    color: (context: any) => context.tick.value === 0 ? '#475569' : '#f1f5f9',
                    lineWidth: (context: any) => context.tick.value === 0 ? 2 : 1
                },
                ticks: { stepSize: 2, font: { size: 9 } }
            },
            y: {
                type: 'linear' as const,
                position: 'left' as const,
                min: -10,
                max: 14,
                title: {
                    display: true,
                    text: '2 * Mesomorfismo - (Endo + Ecto) (Y)',
                    font: { size: 10, weight: 'bold' as const, family: 'Inter' },
                    color: '#6b7280'
                },
                grid: {
                    color: (context: any) => context.tick.value === 0 ? '#475569' : '#f1f5f9',
                    lineWidth: (context: any) => context.tick.value === 0 ? 2 : 1
                },
                ticks: { stepSize: 2, font: { size: 9 } }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1f2937',
                padding: 10,
                cornerRadius: 8,
                callbacks: {
                    label: function (context: any) {
                        const pt = somatoPoints[context.dataIndex];
                        if (!pt) return '';
                        return [
                            ` Fecha: ${pt.date}`,
                            ` Somatotipo: ${pt.endo.toFixed(1)} - ${pt.meso.toFixed(1)} - ${pt.ecto.toFixed(1)}`,
                            ` Coord: (${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})`
                        ];
                    }
                }
            }
        }
    };

    return (
        <div className="bg-base-100 rounded-2xl border border-base-300 shadow-sm overflow-hidden mb-8">
            {/* Cabecera de Tabs */}
            <div className="flex flex-col sm:flex-row border-b border-base-200 bg-base-200/50 p-2 gap-2 sm:justify-between sm:items-center">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide max-w-full">
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 whitespace-nowrap ${
                            activeTab === 'history'
                                ? 'bg-base-100 text-emerald-600 shadow-sm'
                                : 'text-base-content/60 hover:text-base-content hover:bg-base-200'
                        }`}
                    >
                        <Activity size={14} />
                        Tendencias
                    </button>
                    <button
                        onClick={() => setActiveTab('fraction')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 whitespace-nowrap ${
                            activeTab === 'fraction'
                                ? 'bg-base-100 text-emerald-600 shadow-sm'
                                : 'text-base-content/60 hover:text-base-content hover:bg-base-200'
                        }`}
                    >
                        <PieChart size={14} />
                        Fraccionamiento (4 Comp)
                    </button>
                    <button
                        onClick={() => setActiveTab('somatochart')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 whitespace-nowrap ${
                            activeTab === 'somatochart'
                                ? 'bg-base-100 text-emerald-600 shadow-sm'
                                : 'text-base-content/60 hover:text-base-content hover:bg-base-200'
                        }`}
                    >
                        <Grid size={14} />
                        Somatocarta
                    </button>
                </div>

                <div className="text-[10px] text-base-content/50 flex items-center gap-1 px-3 sm:px-0">
                    <Info size={12} /> Última actualización: {metrics.labels[metrics.labels.length - 1]}
                </div>
            </div>

            {/* Contenido de Tab */}
            <div className="p-6">
                {activeTab === 'history' && (
                    <div className="h-64 sm:h-80">
                        {totalMeasurements < 2 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-base-content/50 space-y-2">
                                <TrendingUp size={24} className="text-base-content/40 animate-bounce" />
                                <p className="text-sm font-semibold">Datos insuficientes para tendencias</p>
                                <p className="text-xs">Se requieren al menos 2 mediciones registradas para graficar la evolución temporal.</p>
                            </div>
                        ) : (
                            <MultyLineChart
                                title="Evolución de Composición Corporal"
                                labels={metrics.labels}
                                datasets={[
                                    {
                                        label: "Peso (kg)",
                                        data: metrics.datasets.weight,
                                        color: "#3b82f6", // Blue
                                        fill: true
                                    },
                                    {
                                        label: "Masa Muscular (kg)",
                                        data: metrics.datasets.muscleMass || [],
                                        color: "#10b981", // Emerald
                                        fill: false
                                    },
                                    {
                                        label: "Grasa (%)",
                                        data: metrics.datasets.fatPercentage || [],
                                        color: "#f59e0b", // Amber
                                        fill: false
                                    },
                                    {
                                        label: "Masa Ósea (kg)",
                                        data: metrics.datasets.boneMass || [],
                                        color: "#eab308", // Yellow
                                        fill: false
                                    }
                                ]}
                            />
                        )}
                    </div>
                )}

                {activeTab === 'fraction' && (
                    <div className="h-auto md:h-80 flex flex-col md:flex-row items-center justify-center gap-8 py-4 md:py-0">
                        {!hasFractionation ? (
                            <div className="flex flex-col items-center justify-center text-center text-base-content/50 space-y-2 py-12">
                                <PieChart size={32} className="text-base-content/40" />
                                <p className="text-sm font-semibold">Sin datos de Fraccionamiento</p>
                                <p className="text-xs max-w-sm">Registrá una medición completa ingresando pliegues, perímetros y diámetros para calcular la composición en 4 componentes (Kerr).</p>
                            </div>
                        ) : (
                            <>
                                <div className="w-full h-64 md:h-full md:flex-1 max-h-[260px] relative">
                                    <Doughnut data={doughnutData} options={doughnutOptions} />
                                </div>
                                <div className="w-full md:w-72 bg-base-200 p-4 rounded-xl border border-base-200 space-y-2 shrink-0">
                                    <h4 className="text-xs font-bold text-base-content/70 uppercase tracking-wide">Composición Corporal Más Reciente</h4>
                                    <div className="divide-y divide-gray-100 text-xs">
                                        <div className="flex justify-between py-1.5">
                                            <span className="text-base-content/60">Peso Total:</span>
                                            <span className="font-bold text-base-content">{latestWeight.toFixed(2)} kg</span>
                                        </div>
                                        <div className="flex justify-between py-1.5">
                                            <span className="text-base-content/60 flex items-center gap-1">
                                                <span className="w-2.5 h-2.5 bg-amber-500/80 rounded-full"></span>
                                                Masa Adiposa (Kerr):
                                            </span>
                                            <span className="font-bold text-amber-700">{latestAdipose.toFixed(2)} kg ({((latestAdipose/latestWeight)*100).toFixed(1)}%)</span>
                                        </div>
                                        <div className="flex justify-between py-1.5">
                                            <span className="text-base-content/60 flex items-center gap-1">
                                                <span className="w-2.5 h-2.5 bg-emerald-500/80 rounded-full"></span>
                                                Masa Muscular (Lee):
                                            </span>
                                            <span className="font-bold text-emerald-700">{latestMuscle.toFixed(2)} kg ({((latestMuscle/latestWeight)*100).toFixed(1)}%)</span>
                                        </div>
                                        <div className="flex justify-between py-1.5">
                                            <span className="text-base-content/60 flex items-center gap-1">
                                                <span className="w-2.5 h-2.5 bg-yellow-500/80 rounded-full"></span>
                                                Masa Ósea (Rocha):
                                            </span>
                                            <span className="font-bold text-yellow-700">{latestBone.toFixed(2)} kg ({((latestBone/latestWeight)*100).toFixed(1)}%)</span>
                                        </div>
                                        {isPediatric ? (
                                            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-2 font-medium">
                                                Masa residual omitida: las fórmulas de Kerr, Rocha y Lee están calibradas en población adulta y no son confiables en menores de 18 años.
                                            </p>
                                        ) : (
                                            <div className="flex justify-between py-1.5">
                                                <span className="text-base-content/60 flex items-center gap-1">
                                                    <span className="w-2.5 h-2.5 bg-rose-500/80 rounded-full"></span>
                                                    Masa Residual:
                                                </span>
                                                <span className="font-bold text-rose-700">{latestResidual.toFixed(2)} kg ({((latestResidual/latestWeight)*100).toFixed(1)}%)</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'somatochart' && (
                    <div className="h-auto md:h-80 flex flex-col md:flex-row items-center justify-center gap-8 py-4 md:py-0">
                        {!hasSomatotype ? (
                            <div className="flex flex-col items-center justify-center text-center text-base-content/50 space-y-2 py-12">
                                <Grid size={32} className="text-base-content/40" />
                                <p className="text-sm font-semibold">Sin datos de Somatotipo</p>
                                <p className="text-xs max-w-sm">Registrá pliegues, diámetros y perímetros para poder calcular el somatotipo de Heath-Carter y graficarlo en la somatocarta.</p>
                            </div>
                        ) : (
                            <>
                                <div className="w-full h-64 md:h-full md:flex-1 max-h-[260px] relative">
                                    <Line data={somatochartData} options={somatochartOptions} />
                                </div>
                                <div className="w-full md:w-72 bg-base-200 p-4 rounded-xl border border-base-200 space-y-3 shrink-0">
                                    <h4 className="text-xs font-bold text-base-content/70 uppercase tracking-wide">Somatotipo Más Reciente</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-rose-100 border border-rose-200 p-2 rounded-lg text-center">
                                            <div className="text-[10px] text-rose-700 uppercase font-bold">Endo</div>
                                            <div className="text-base font-black text-rose-800 mt-0.5">{latestEndo.toFixed(1)}</div>
                                        </div>
                                        <div className="bg-sky-100 border border-sky-200 p-2 rounded-lg text-center">
                                            <div className="text-[10px] text-sky-700 uppercase font-bold">Meso</div>
                                            <div className="text-base font-black text-sky-800 mt-0.5">{latestMeso.toFixed(1)}</div>
                                        </div>
                                        <div className="bg-amber-100 border border-amber-200 p-2 rounded-lg text-center">
                                            <div className="text-[10px] text-amber-700 uppercase font-bold">Ecto</div>
                                            <div className="text-base font-black text-amber-800 mt-0.5">{latestEcto.toFixed(1)}</div>
                                        </div>
                                    </div>
                                    <div className="text-[11px] text-base-content/60 leading-relaxed bg-base-100 p-2.5 rounded border border-base-300/60">
                                        <strong>Punto actual:</strong> ({ (latestEcto - latestEndo).toFixed(1) }, { (2 * latestMeso - (latestEndo + latestEcto)).toFixed(1) }). 
                                        <br />
                                        La línea muestra el camino de evolución del somatotipo a lo largo del tiempo.
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};