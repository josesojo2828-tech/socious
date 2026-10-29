'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePatient } from '@/features/nutringest/patient/hooks/usePatient';
import { useAnthropometry } from '@/features/nutringest/patient/hooks/useAnthropometry';
import { Scatter, Doughnut } from 'react-chartjs-2';
import { ArrowLeft, Printer, Activity, Grid, User, Award, ShieldCheck, Scale, Download, HeartPulse } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { 
    MeasurementsDocument, 
    getSomatotypeCategory, 
    calculateHealthIndices, 
    getSomatotypeComponentInterpretation 
} from '@/features/nutringest/patient/pdf/MeasurementsDocument';
import { calculateMirwaldPhv } from '@/features/calculadora/lib/mirwald.engine';
import {
    calculateFrisanchoComposition,
    classifyFatReserve,
    classifyMuscleReserve,
} from '@/features/nutringest/patient/lib/frisancho.engine';
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

export default function PatientAnthropometryReportPage() {
    const params = useParams();
    const router = useRouter();
    const patientId = params.id as string;

    const { currentPatient, fetchPatientById } = usePatient();
    const { history, fetchHistory } = useAnthropometry(patientId);

    useEffect(() => {
        if (patientId) {
            fetchPatientById(patientId);
            fetchHistory();
        }
    }, [patientId, fetchPatientById, fetchHistory]);

    const handlePrint = () => {
        window.print();
    };

    if (!currentPatient) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-base-200 text-base-content/50 text-sm">
                Cargando datos del informe cineantropométrico...
            </div>
        );
    }

    const calculateAge = (birthDateString: string, referenceDate?: string | Date) => {
        if (!birthDateString) return '-';
        const today = referenceDate ? new Date(referenceDate) : new Date();
        const birthDate = new Date(birthDateString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const age = calculateAge(currentPatient.birthDate);
    const latestMeasurement = history.length > 0 ? history[0] : null;
    // Percentiles are age-specific, so the report uses the age at the measurement
    // date (it describes that measurement), not the age on the day it was printed.
    const ageAtMeasurement = latestMeasurement?.date
        ? calculateAge(currentPatient.birthDate, latestMeasurement.date)
        : age;
    const isMale = currentPatient.gender === 'MALE' || currentPatient.gender === 'MASCULINO';

    // Resumen del tab pediátrico (Mirwald)
    const pediatricSummary = (() => {
        const gender = currentPatient.gender;
        const ageNum = typeof age === 'number' ? age : 0;
        if (!latestMeasurement || (gender !== 'MALE' && gender !== 'FEMALE') || ageNum <= 0) return null;
        const weight = Number(latestMeasurement.weight);
        const height = Number(latestMeasurement.height);
        const sittingHeight = Number(latestMeasurement.sittingHeight);
        if (!weight || !height || !sittingHeight) return null;
        const result = calculateMirwaldPhv({
            gender,
            age: ageNum,
            weightKg: weight,
            heightCm: height,
            sittingHeightCm: sittingHeight,
        });
        return {
            lei: height - sittingHeight,
            phv: result.value,
            sign: result.sign,
            interpretation: `${Math.abs(result.value).toFixed(1)} años ${result.sign === 1 ? 'desde' : 'hasta'} el pico de velocidad de crecimiento (PHV)`,
            rangeValid: result.rangeValid,
        };
    })();

    const latestAdipose = Number(latestMeasurement?.adiposeMass ?? latestMeasurement?.adiposeMassKg) || 0;
    const latestMuscle = Number(latestMeasurement?.muscleMass ?? latestMeasurement?.muscleMassKg) || 0;
    const latestBone = Number(latestMeasurement?.boneMass ?? latestMeasurement?.boneMassKg) || 0;
    const latestResidualRaw = Number(latestMeasurement?.residualMass ?? latestMeasurement?.residualMassKg) || 0;
    const latestWeight = Number(latestMeasurement?.weight) || 1;
    const latestHeight = Number(latestMeasurement?.height) || 0;

    // Kerr/Rocha/Lee are adult-calibrated formulas. For pediatric patients the
    // residual is omitted (the calculator skips it) and the reference ranges
    // below do not apply, so flag the section instead of showing misleading numbers.
    const isPediatric = typeof age === 'number' && age > 0 && age < 18;
    const latestResidual = isPediatric ? 0 : latestResidualRaw;

    const hasFractionation = latestAdipose > 0 || latestMuscle > 0 || latestBone > 0 || latestResidual > 0;

    // Expected residual range for a healthy 4-component fractionation is 10-15%
    // of body weight. Independent empirical estimates can saturate the weight
    // and collapse the residual, so flag it instead of silently displaying it.
    const residualPercent = latestWeight > 0 ? (latestResidual / latestWeight) * 100 : 0;
    const residualOutOfRange = !isPediatric && hasFractionation && (residualPercent < 10 || residualPercent > 15);

    const doughnutData = {
        labels: isPediatric
            ? ['Masa Adiposa (Grasa)', 'Masa Muscular', 'Masa Ósea (Esqueleto)']
            : ['Masa Adiposa (Grasa)', 'Masa Muscular', 'Masa Ósea (Esqueleto)', 'Masa Residual (Órganos)'],
        datasets: [
            {
                data: isPediatric
                    ? [latestAdipose, latestMuscle, latestBone]
                    : [latestAdipose, latestMuscle, latestBone, latestResidual],
                backgroundColor: isPediatric
                    ? ['#f59e0b', '#10b981', '#64748b']
                    : ['#f59e0b', '#10b981', '#64748b', '#3b82f6'],
                borderWidth: 1,
                borderColor: '#ffffff',
            },
        ],
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    boxWidth: 10,
                    font: { size: 10 },
                },
            },
        },
    };

    const latestEndo = latestMeasurement?.endomorphy || 0;
    const latestMeso = latestMeasurement?.mesomorphy || 0;
    const latestEcto = latestMeasurement?.ectomorphy || 0;

    const hasSomatotype = latestEndo > 0 || latestMeso > 0 || latestEcto > 0;

    const somatoX = latestEcto - latestEndo;
    const somatoY = 2 * latestMeso - (latestEndo + latestEcto);

    const somatochartData = {
        datasets: [
            {
                label: 'Paciente',
                data: [{ x: somatoX, y: somatoY }],
                backgroundColor: '#ef4444',
                borderColor: '#ffffff',
                borderWidth: 2,
                pointRadius: 8,
                pointHoverRadius: 10,
            },
        ],
    };

    const somatochartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: 'linear' as const,
                position: 'center' as const,
                min: -10,
                max: 10,
                title: {
                    display: true,
                    text: 'Ecto - Endo (X)',
                    font: { size: 9, weight: 'bold' as const },
                    color: '#6b7280',
                },
                grid: {
                    color: (ctx: any) => ctx.tick?.value === 0 ? '#1e293b' : '#e2e8f0',
                    lineWidth: (ctx: any) => ctx.tick?.value === 0 ? 2 : 1,
                },
                ticks: { stepSize: 2, font: { size: 9 } }
            },
            y: {
                type: 'linear' as const,
                position: 'center' as const,
                min: -10,
                max: 14,
                title: {
                    display: true,
                    text: '2Meso - (Endo+Ecto) (Y)',
                    font: { size: 9, weight: 'bold' as const },
                    color: '#6b7280',
                },
                grid: {
                    color: (ctx: any) => ctx.tick?.value === 0 ? '#1e293b' : '#e2e8f0',
                    lineWidth: (ctx: any) => ctx.tick?.value === 0 ? 2 : 1,
                },
                ticks: { stepSize: 2, font: { size: 9 } }
            },
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context: any) => `Coordenada: (${context.parsed.x.toFixed(1)}, ${context.parsed.y.toFixed(1)})`
                }
            }
        },
    };

    const healthIndices = calculateHealthIndices(latestMeasurement, currentPatient.gender, latestWeight, latestHeight);

    // --- Pliegues cutáneos (ISAK) y percentiles pediátricos de Frisancho ---
    const SKINFOLD_FIELDS = [
        { key: 'tricipital', label: 'Tricipital' },
        { key: 'subscapular', label: 'Subescapular' },
        { key: 'skinfoldSupraspinale', label: 'Supraespinal' },
        { key: 'abdominal', label: 'Abdominal' },
        { key: 'thigh', label: 'Muslo anterior' },
        { key: 'calf', label: 'Pantorrilla medial' },
    ] as const;

    const skinfoldRows = SKINFOLD_FIELDS.map(({ key, label }) => {
        const raw = latestMeasurement?.[key];
        const parsed = raw === null || raw === undefined || raw === '' ? NaN : Number(raw);
        return { key, label, value: Number.isFinite(parsed) ? parsed : null };
    });

    const presentSkinfolds = skinfoldRows.filter((fold) => fold.value !== null);
    const skinfoldSum6 = presentSkinfolds.reduce((total, fold) => total + (fold.value as number), 0);
    const hasCompleteSum6 = presentSkinfolds.length === SKINFOLD_FIELDS.length;

    const frisancho = (() => {
        const ageNum = typeof ageAtMeasurement === 'number' ? ageAtMeasurement : 0;
        const muacCm = Number(
            latestMeasurement?.midUpperArmCircumferenceCm ??
            latestMeasurement?.c_arm_relaxed ??
            latestMeasurement?.arm
        ) || 0;
        const tsfMm = Number(
            latestMeasurement?.tricepsSkinfoldMm ??
            latestMeasurement?.tricipital
        ) || 0;
        if (!latestMeasurement || muacCm <= 0 || tsfMm <= 0 || ageNum < 1 || ageNum > 18) return null;
        return calculateFrisanchoComposition({
            muacCm,
            tsfMm,
            gender: currentPatient.gender,
            ageYears: ageNum,
        });
    })();

    const frisanchoPercentileRows = (() => {
        if (!frisancho?.percentiles) return [];
        const { percentiles } = frisancho;
        return [
            {
                label: 'Pliegue tricipital',
                unit: 'mm',
                value: frisancho.tsfMm,
                row: percentiles.tsf,
                evaluation: frisancho.fatEvaluation,
            },
            {
                label: 'Perímetro braquial (MUAC)',
                unit: 'cm',
                value: frisancho.muacCm,
                row: percentiles.muac,
                evaluation: classifyMuscleReserve(frisancho.muacCm, percentiles.muac),
            },
            {
                label: 'Área muscular (AMA)',
                unit: 'cm²',
                value: frisancho.amaCm2,
                row: percentiles.ama,
                evaluation: frisancho.muscleEvaluation,
            },
            {
                label: 'Área grasa (AFA)',
                unit: 'cm²',
                value: frisancho.afaCm2,
                row: percentiles.afa,
                evaluation: classifyFatReserve(frisancho.afaCm2, percentiles.afa),
            },
        ];
    })();

    const percentileCategoryLabel = (category: string) => category.replace(/p(\d+)/gi, 'P$1');

    return (
        <div className="min-h-screen bg-base-200/70 py-8 print:py-0 print:m-0 print:bg-base-100 animate-in fade-in duration-300">
            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm;
                    }
                    body {
                        background: #ffffff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}</style>
            {/* Barra superior de control y acciones (No se imprime) */}
            <div className="max-w-4xl mx-auto px-4 mb-6 flex justify-between items-center print:hidden shrink-0">
                <button
                    onClick={() => router.push(`/dashboard/patients/${currentPatient.id}`)}
                    className="flex items-center gap-2 text-xs font-bold text-base-content/60 hover:text-base-content transition-colors uppercase tracking-wider bg-base-100 px-3.5 py-2 rounded-xl border border-base-300 shadow-sm"
                >
                    <ArrowLeft size={16} /> Volver al Expediente
                </button>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrint}
                        className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-[0.98]"
                    >
                        <Printer size={16} /> Exportar Reporte / PDF
                    </button>
                    <PDFDownloadLink
                        document={
                            <MeasurementsDocument
                                patient={currentPatient}
                                measurement={latestMeasurement}
                                age={typeof age === 'number' ? age : 0}
                                pediatricSummary={pediatricSummary}
                                frisanchoSummary={frisancho}
                            />
                        }
                        fileName={`Informe_Medidas_${currentPatient.firstName}.pdf`}
                        className="btn btn-sm bg-[#0d0ea0] hover:bg-[#0a0b80] text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-[0.98]"
                    >
                        {({ loading }) =>
                            loading ? (
                                'Generando PDF...'
                            ) : (
                                <>
                                    <Download size={16} /> Descargar PDF
                                </>
                            )
                        }
                    </PDFDownloadLink>
                </div>
            </div>

            {/* Página del Reporte */}
            <div className="max-w-4xl mx-auto p-8 sm:p-12 bg-base-100 border border-base-300 rounded-2xl shadow-lg print:shadow-none print:border-none print:p-0 print:my-0 relative overflow-hidden">

                {/* Marca de Agua Institucional de Fondo */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none print:opacity-[0.04]">
                    <img src="/png/IsologoNegro.png" alt="" className="w-[450px] h-auto object-contain" />
                </div>

                {/* Cabecera del Reporte Institucional */}
                <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-slate-900 pb-6 gap-4">
                    <div className="flex items-center gap-4">
                        <img
                            src="/png/ImagotipoNegro.png"
                            alt="Nutringest Logo"
                            className="h-10 sm:h-12 w-auto object-contain shrink-0"
                        />
                        <div className="pl-3 border-l border-base-300">
                            <h1 className="text-xl sm:text-2xl font-black text-base-content tracking-tight leading-none uppercase">
                                Informe Cineantropométrico
                            </h1>
                            <p className="text-[11px] font-bold text-emerald-700 tracking-wider mt-1.5 uppercase flex items-center gap-1.5">
                                <ShieldCheck size={13} className="text-emerald-600" /> Protocolo Nutringest
                            </p>
                        </div>
                    </div>
                    <div className="text-left sm:text-right shrink-0 bg-base-200 print:bg-transparent p-3 sm:p-0 rounded-xl border border-base-200 sm:border-none w-full sm:w-auto">
                        <div className="text-[11px] font-bold text-base-content/90 uppercase tracking-wide">
                            Expediente: <span className="font-mono text-base-content font-extrabold">#{patientId.slice(0, 8).toUpperCase()}</span>
                        </div>
                        <p className="text-[11px] text-base-content/60 font-medium mt-0.5">
                            Fecha de Emisión: {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                </div>

                {/* Información del Paciente */}
                <div className="relative mt-6 bg-base-200/80 border border-base-300 rounded-xl p-5 print:bg-base-200/40 print:border-base-300">
                    <div className="flex items-center justify-between mb-3 border-b border-base-300/60 pb-2">
                        <h2 className="text-[11px] font-bold text-base-content/60 uppercase tracking-widest flex items-center gap-1.5">
                            <User size={13} className="text-base-content/70" /> Ficha del Paciente
                        </h2>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 print:border print:border-emerald-200">
                            Estado Clínico: Evaluado
                        </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                            <p className="text-[11px] text-base-content/50 font-medium">Nombre Completo</p>
                            <p className="font-bold text-base-content text-sm mt-0.5">{currentPatient.firstName} {currentPatient.lastName}</p>
                        </div>
                        <div>
                            <p className="text-[11px] text-base-content/50 font-medium">Documento de Identidad</p>
                            <p className="font-semibold text-base-content text-sm mt-0.5">{(currentPatient as any).document || (currentPatient as any).documentNumber || (currentPatient as any).docNumber || 'No registrado'}</p>
                        </div>
                        <div>
                            <p className="text-[11px] text-base-content/50 font-medium">Género / Edad</p>
                            <p className="font-semibold text-base-content text-sm mt-0.5">
                                {currentPatient.gender === 'MALE' ? 'Masculino' : 'Femenino'} ({age} años)
                            </p>
                        </div>
                        <div>
                            <p className="text-[11px] text-base-content/50 font-medium">Fecha Nacimiento</p>
                            <p className="font-semibold text-base-content text-sm mt-0.5">
                                {new Date(currentPatient.birthDate).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Resumen de Última Medición */}
                {history.length > 0 && (
                    <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 text-center">
                            <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider">Peso Corporal</span>
                            <p className="text-lg font-black text-base-content mt-0.5">
                                {history[0].weight ? `${Number(history[0].weight).toFixed(1)} kg` : '-'}
                            </p>
                        </div>
                        <div className="bg-base-200 border border-base-300 rounded-xl p-3 text-center">
                            <span className="text-[10px] font-bold uppercase text-base-content/60 tracking-wider">Estatura / Talla</span>
                            <p className="text-lg font-black text-base-content mt-0.5">
                                {history[0].height ? `${Number(history[0].height).toFixed(1)} cm` : '-'}
                            </p>
                        </div>
                        <div className="bg-base-200 border border-base-300 rounded-xl p-3 text-center">
                            <span className="text-[10px] font-bold uppercase text-base-content/60 tracking-wider">Índice Masa Corp. (IMC)</span>
                            <p className="text-lg font-black text-base-content mt-0.5">
                                {history[0].bmi ? Number(history[0].bmi).toFixed(2) : '-'}
                            </p>
                        </div>
                        <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-3 text-center">
                            <span className="text-[10px] font-bold uppercase text-purple-800 tracking-wider">% Grasa Corporal</span>
                            <p className="text-lg font-black text-base-content mt-0.5">
                                {history[0].fatPercentage ? `${Number(history[0].fatPercentage).toFixed(2)}%` : '-'}
                            </p>
                        </div>
                    </div>
                )}

                {/* 1. Historial de Mediciones */}
                <div className="relative mt-8">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xs font-bold text-base-content/90 uppercase tracking-widest flex items-center gap-1.5">
                            <Activity size={14} className="text-emerald-600" /> 1. Registro Histórico de Mediciones & Índices
                        </h2>
                        <span className="text-[10px] font-medium text-base-content/50">Mediciones ordenadas por fecha</span>
                    </div>
                    <div className="border border-base-300 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
                                <tr>
                                    <th className="px-4 py-3">Fecha</th>
                                    <th className="px-4 py-3">Peso (kg)</th>
                                    <th className="px-4 py-3">Talla (cm)</th>
                                    <th className="px-4 py-3">IMC</th>
                                    <th className="px-4 py-3">Grasa (%)</th>
                                    <th className="px-4 py-3">Músculo (%)</th>
                                    <th className="px-4 py-3">Cintura (cm)</th>
                                    <th className="px-4 py-3">Cadera (cm)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-base-content/90">
                                {history.map((item, index) => (
                                    <tr key={item.id} className={index % 2 === 0 ? 'bg-base-100' : 'bg-base-200/50'}>
                                        <td className="px-4 py-2.5 font-bold text-base-content">{new Date(item.date).toLocaleDateString()}</td>
                                        <td className="px-4 py-2.5 font-semibold text-base-content">{item.weight ? `${Number(item.weight).toFixed(1)} kg` : '-'}</td>
                                        <td className="px-4 py-2.5">{item.height ? `${Number(item.height).toFixed(1)} cm` : '-'}</td>
                                        <td className="px-4 py-2.5 font-semibold text-base-content">{item.bmi ? Number(item.bmi).toFixed(2) : '-'}</td>
                                        <td className="px-4 py-2.5 font-medium">{item.fatPercentage ? `${Number(item.fatPercentage).toFixed(2)}%` : '-'}</td>
                                        <td className="px-4 py-2.5 font-medium">{item.muscleMass ? `${Number(item.muscleMass).toFixed(2)}%` : '-'}</td>
                                        <td className="px-4 py-2.5">{item.waist ? `${Number(item.waist).toFixed(1)} cm` : '-'}</td>
                                        <td className="px-4 py-2.5">{item.hip ? `${Number(item.hip).toFixed(1)} cm` : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 2. Composición Corporal (Fraccionamiento de 4 Componentes con Valores Referenciales) */}
                <div className="relative mt-8 border-t border-base-300 pt-6">
                    <h2 className="text-xs font-bold text-base-content/90 uppercase tracking-widest mb-5 flex items-center gap-1.5">
                        <Scale size={14} className="text-emerald-600" /> 2. Composición Corporal (Fraccionamiento de 4 Componentes - Kerr)
                    </h2>

                    <div className="bg-base-200/60 border border-base-300 rounded-xl p-5 flex flex-col md:flex-row items-center gap-6">
                        {/* Doughnut Fraccionamiento */}
                        <div className="w-full md:w-1/2 flex flex-col items-center">
                            {hasFractionation ? (
                                <div className="h-48 w-full relative">
                                    <Doughnut data={doughnutData} options={doughnutOptions} />
                                </div>
                            ) : (
                                <div className="h-44 flex items-center justify-center text-center text-base-content/50 text-xs px-4">
                                    Requiere pliegues cutáneos y perímetros corporales para el cálculo del fraccionamiento tisular.
                                </div>
                            )}
                        </div>

                        {/* Tabla con Valores Obtenidos vs Referenciales */}
                        <div className="w-full md:w-1/2 space-y-2 text-xs">
                            <div className="flex justify-between items-center bg-slate-900 text-white p-2 rounded-lg font-bold text-[11px] uppercase tracking-wider">
                                <span>Componente</span>
                                <span>Valor</span>
                                <span>Ref. Saludable</span>
                            </div>

                            <div className="flex justify-between items-center bg-base-100 p-2 rounded-lg border border-base-200 shadow-sm">
                                <span className="text-base-content/70 font-semibold flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Masa Adiposa:
                                </span>
                                <span className="font-extrabold text-amber-700">{Number(latestAdipose).toFixed(2)} kg ({((latestAdipose / latestWeight) * 100).toFixed(1)}%)</span>
                                <span className="text-base-content/50 font-medium text-[11px]">{isMale ? '10% - 20%' : '18% - 28%'}</span>
                            </div>

                            <div className="flex justify-between items-center bg-base-100 p-2 rounded-lg border border-base-200 shadow-sm">
                                <span className="text-base-content/70 font-semibold flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Masa Muscular:
                                </span>
                                <span className="font-extrabold text-emerald-700">{Number(latestMuscle).toFixed(2)} kg ({((latestMuscle / latestWeight) * 100).toFixed(1)}%)</span>
                                <span className="text-base-content/50 font-medium text-[11px]">{isMale ? '40% - 50%' : '30% - 40%'}</span>
                            </div>

                            <div className="flex justify-between items-center bg-base-100 p-2 rounded-lg border border-base-200 shadow-sm">
                                <span className="text-base-content/70 font-semibold flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-base-2000"></span> Masa Ósea:
                                </span>
                                <span className="font-extrabold text-base-content/90">{Number(latestBone).toFixed(2)} kg ({((latestBone / latestWeight) * 100).toFixed(1)}%)</span>
                                <span className="text-base-content/50 font-medium text-[11px]">{isMale ? '12% - 16%' : '10% - 14%'}</span>
                            </div>

                            {isPediatric ? (
                                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 font-medium">
                                    Masa residual omitida: las fórmulas de Kerr, Rocha y Lee están calibradas en población adulta y no son confiables en menores de 18 años.
                                </p>
                            ) : (
                                <div className={`flex justify-between items-center p-2 rounded-lg border shadow-sm ${residualOutOfRange ? 'bg-amber-50 border-amber-300' : 'bg-base-100 border-base-200'}`}>
                                    <span className="text-base-content/70 font-semibold flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Masa Residual:
                                    </span>
                                    <span className={`font-extrabold ${residualOutOfRange ? 'text-amber-700' : 'text-blue-700'}`}>{Number(latestResidual).toFixed(2)} kg ({residualPercent.toFixed(1)}%)</span>
                                    <span className={`text-[11px] ${residualOutOfRange ? 'text-amber-700 font-bold' : 'text-base-content/50 font-medium'}`}>
                                        {residualOutOfRange ? 'Fuera de rango — esperado 10% - 15%' : '10% - 15%'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Pliegues Cutáneos & Percentiles de Referencia (Frisancho) */}
                {latestMeasurement && (
                    <div className="relative mt-8 border-t border-base-300 pt-6">
                        <h2 className="text-xs font-bold text-base-content/90 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                            <Grid size={14} className="text-emerald-600" /> 3. Pliegues Cutáneos & Percentiles de Referencia (Frisancho)
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Sumatoria de pliegues */}
                            <div>
                                <h3 className="text-[11px] font-extrabold text-base-content uppercase tracking-wider mb-2">
                                    Sumatoria de Pliegues (ISAK)
                                </h3>
                                <div className="border border-base-300 rounded-xl overflow-hidden bg-base-100 shadow-sm">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-base-200 text-base-content/90 font-bold uppercase tracking-wider text-[10px] border-b border-base-300">
                                            <tr>
                                                <th className="px-3 py-2">Pliegue</th>
                                                <th className="px-3 py-2 text-right">Valor (mm)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-base-content/80">
                                            {skinfoldRows.map((fold) => (
                                                <tr key={fold.key}>
                                                    <td className="px-3 py-2 font-medium">{fold.label}</td>
                                                    <td className="px-3 py-2 text-right font-semibold">
                                                        {fold.value !== null ? fold.value.toFixed(1) : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                                                <td className="px-3 py-2.5 font-black text-emerald-900 text-[11px] uppercase tracking-wide">
                                                    Σ 6 pliegues {hasCompleteSum6 ? '' : `(${presentSkinfolds.length}/6)`}
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-black text-emerald-900">
                                                    {presentSkinfolds.length > 0 ? `${skinfoldSum6.toFixed(1)} mm` : '—'}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                                {!hasCompleteSum6 && presentSkinfolds.length > 0 && (
                                    <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-2 font-medium">
                                        La sumatoria ISAK de 6 pliegues requiere tricipital, subescapular, supraespinal, abdominal, muslo y pantorrilla.
                                    </p>
                                )}
                            </div>

                            {/* Percentiles Frisancho */}
                            <div>
                                <h3 className="text-[11px] font-extrabold text-base-content uppercase tracking-wider mb-2">
                                    Percentiles por Edad y Sexo (Frisancho)
                                </h3>
                                {frisancho && frisancho.percentiles ? (
                                    <>
                                        <div className="border border-base-300 rounded-xl overflow-hidden bg-base-100 shadow-sm overflow-x-auto">
                                            <table className="w-full text-[11px] text-left">
                                                <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[9px]">
                                                    <tr>
                                                        <th className="px-2 py-2">Métrica</th>
                                                        <th className="px-2 py-2 text-right">Valor</th>
                                                        <th className="px-2 py-2 text-center">P5</th>
                                                        <th className="px-2 py-2 text-center">P15</th>
                                                        <th className="px-2 py-2 text-center">P50</th>
                                                        <th className="px-2 py-2 text-center">P85</th>
                                                        <th className="px-2 py-2 text-center">P95</th>
                                                        <th className="px-2 py-2 text-center">Ubicación</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {frisanchoPercentileRows.map((item) => (
                                                        <tr key={item.label}>
                                                            <td className="px-2 py-2 font-semibold text-base-content">{item.label}</td>
                                                            <td className="px-2 py-2 text-right font-bold text-base-content">
                                                                {item.value.toFixed(1)} <span className="text-[9px] font-medium text-base-content/50">{item.unit}</span>
                                                            </td>
                                                            <td className="px-2 py-2 text-center text-base-content/60">{item.row.p5.toFixed(1)}</td>
                                                            <td className="px-2 py-2 text-center text-base-content/60">{item.row.p15.toFixed(1)}</td>
                                                            <td className="px-2 py-2 text-center font-semibold text-base-content/80">{item.row.p50.toFixed(1)}</td>
                                                            <td className="px-2 py-2 text-center text-base-content/60">{item.row.p85.toFixed(1)}</td>
                                                            <td className="px-2 py-2 text-center text-base-content/60">{item.row.p95.toFixed(1)}</td>
                                                            <td className="px-2 py-2 text-center">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${item.evaluation.badgeColor} ${item.evaluation.badgeBorder}`}>
                                                                    {percentileCategoryLabel(item.evaluation.category)}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="mt-2 space-y-1 text-[10px] text-base-content/60">
                                            <p>
                                                Banda de referencia: {frisancho.ageBracket} · cAMA Heymsfield: {frisancho.camaCm2 != null ? `${frisancho.camaCm2.toFixed(1)} cm²` : '—'} · AFI: {frisancho.afiPercent.toFixed(1)}%
                                            </p>
                                            <p className="font-medium text-base-content/70">{frisancho.summary}</p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-full min-h-[160px] border border-dashed border-base-300 rounded-xl flex items-center justify-center text-center text-base-content/50 text-xs px-4">
                                        Los percentiles de Frisancho aplican de 1 a 18 años y requieren perímetro braquial y pliegue tricipital.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. Índices de Salud y Riesgo Cardiometabólico */}
                {healthIndices.length > 0 && (
                    <div className="relative mt-8 border-t border-base-300 pt-6">
                        <h2 className="text-xs font-bold text-base-content/90 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                            <HeartPulse size={14} className="text-rose-600" /> 4. Índices de Salud & Riesgo Cardiometabólico
                        </h2>

                        <div className="border border-base-300 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
                                    <tr>
                                        <th className="px-4 py-3">Indicador Clínico</th>
                                        <th className="px-4 py-3 text-center">Valor Paciente</th>
                                        <th className="px-4 py-3 text-center">Rango Saludable</th>
                                        <th className="px-4 py-3 text-right">Interpretación</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-base-content/90">
                                    {healthIndices.map((idx, index) => (
                                        <tr key={index} className={index % 2 === 0 ? 'bg-base-100' : 'bg-base-200/50'}>
                                            <td className="px-4 py-2.5 font-bold text-base-content">{idx.name}</td>
                                            <td className="px-4 py-2.5 font-extrabold text-center text-base-content">
                                                {idx.value} <span className="text-[10px] font-medium text-base-content/60">{idx.unit}</span>
                                            </td>
                                            <td className="px-4 py-2.5 text-center text-base-content/60 font-medium">{idx.reference}</td>
                                            <td className="px-4 py-2.5 text-right">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                    idx.level === 'normal' 
                                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                                        : idx.level === 'warning'
                                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                                                }`}>
                                                    {idx.interpretation}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 5. Somatotipo de Heath-Carter (Gráfica Funcional Scatter + Interpretación Detallada) */}
                <div className="relative mt-8 border-t border-base-300 pt-6">
                    <h2 className="text-xs font-bold text-base-content/90 uppercase tracking-widest mb-5 flex items-center gap-1.5">
                        <Award size={14} className="text-purple-600" /> 5. Somatotipo (Heath-Carter)
                    </h2>

                    <div className="bg-base-200/60 border border-base-300 rounded-xl p-5 flex flex-col items-center">
                        {hasSomatotype ? (
                            <>
                                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                    {/* Gráfico Scatter de la Somatocarta */}
                                    <div className="h-56 w-full relative bg-base-100 p-2 rounded-xl border border-base-300 shadow-inner">
                                        <Scatter data={somatochartData} options={somatochartOptions as any} />
                                    </div>

                                    {/* Valores y Clasificación General */}
                                    <div className="w-full space-y-2 text-xs">
                                        <div className="flex justify-between items-center bg-base-100 p-2 rounded-lg border border-base-200 shadow-sm">
                                            <span className="text-base-content/60 font-medium">Endomorfismo (Adiposidad):</span>
                                            <span className="font-bold text-amber-700">{Number(latestEndo).toFixed(1)}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-base-100 p-2 rounded-lg border border-base-200 shadow-sm">
                                            <span className="text-base-content/60 font-medium">Mesomorfismo (Muscularidad):</span>
                                            <span className="font-bold text-emerald-700">{Number(latestMeso).toFixed(1)}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-base-100 p-2 rounded-lg border border-base-200 shadow-sm">
                                            <span className="text-base-content/60 font-medium">Ectomorfismo (Linealidad):</span>
                                            <span className="font-bold text-blue-700">{Number(latestEcto).toFixed(1)}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-purple-50 p-2 rounded-lg border border-purple-100 font-bold text-purple-900">
                                            <span>Coordenadas Somatotipo:</span>
                                            <span>X: {somatoX.toFixed(1)}, Y: {somatoY.toFixed(1)}</span>
                                        </div>
                                        <div className="flex flex-col bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 font-semibold text-emerald-900">
                                            <span className="text-[10px] text-emerald-700 uppercase font-extrabold">Clasificación Global:</span>
                                            <span className="text-xs font-black mt-0.5">{getSomatotypeCategory(latestEndo, latestMeso, latestEcto)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Tabla de Interpretación Clínica por Componente */}
                                <div className="w-full mt-5 border-t border-base-300 pt-4">
                                    <h3 className="text-[11px] font-extrabold text-base-content uppercase tracking-wider mb-2.5">
                                        Interpretación Clínica por Componente (Heath-Carter)
                                    </h3>
                                    <div className="border border-base-300 rounded-xl overflow-hidden bg-base-100 shadow-sm">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-base-200 text-base-content/90 font-bold uppercase tracking-wider text-[10px] border-b border-base-300">
                                                <tr>
                                                    <th className="px-3 py-2">Componente</th>
                                                    <th className="px-3 py-2">Nivel</th>
                                                    <th className="px-3 py-2">Descripción Clínica</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-base-content/70">
                                                <tr>
                                                    <td className="px-3 py-2 font-bold text-amber-700">Endomorfia ({latestEndo.toFixed(1)})</td>
                                                    <td className="px-3 py-2 font-bold text-base-content">{getSomatotypeComponentInterpretation('endo', latestEndo).level}</td>
                                                    <td className="px-3 py-2 text-base-content/70">{getSomatotypeComponentInterpretation('endo', latestEndo).description}</td>
                                                </tr>
                                                <tr>
                                                    <td className="px-3 py-2 font-bold text-emerald-700">Mesomorfia ({latestMeso.toFixed(1)})</td>
                                                    <td className="px-3 py-2 font-bold text-base-content">{getSomatotypeComponentInterpretation('meso', latestMeso).level}</td>
                                                    <td className="px-3 py-2 text-base-content/70">{getSomatotypeComponentInterpretation('meso', latestMeso).description}</td>
                                                </tr>
                                                <tr>
                                                    <td className="px-3 py-2 font-bold text-blue-700">Ectomorfia ({latestEcto.toFixed(1)})</td>
                                                    <td className="px-3 py-2 font-bold text-base-content">{getSomatotypeComponentInterpretation('ecto', latestEcto).level}</td>
                                                    <td className="px-3 py-2 text-base-content/70">{getSomatotypeComponentInterpretation('ecto', latestEcto).description}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="h-44 flex items-center justify-center text-center text-base-content/50 text-xs px-4">
                                Requiere pliegues de tríceps, subescapular, supraespinal y diámetros para graficar la somatocarta.
                            </div>
                        )}
                    </div>
                </div>

                {/* Pie de página institucional y Firma profesional */}
                <div className="relative mt-12 border-t-2 border-base-300 pt-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 text-xs text-base-content/60">
                    <div className="w-full sm:w-auto">
                        <p className="font-bold text-base-content/90 uppercase tracking-wider text-[10px]">Firma y Sello del Profesional</p>
                        <div className="w-64 h-16 border-b-2 border-dashed border-base-300 mt-2 flex items-end justify-center pb-1">
                            <span className="text-[10px] text-base-content/50 font-medium">Lic. en Nutrición / Especialista ISAK</span>
                        </div>
                    </div>

                    <div className="text-left sm:text-right w-full sm:w-auto border-t sm:border-t-0 border-base-200 pt-3 sm:pt-0">
                        <div className="flex items-center sm:justify-end gap-2 mb-1">
                            <img src="/png/ImagotipoNegro.png" alt="Nutringest" className="h-5 w-auto" />
                            <span className="text-[11px] font-extrabold text-base-content tracking-tight">Clinical Systems</span>
                        </div>
                        <p className="text-[10px] text-base-content/50 font-medium">
                            Documento generado digitalmente a través de Nutringest® Cloud Platform
                        </p>
                        <p className="text-[10px] text-base-content/50 font-medium">
                            www.nutringest.com • info@nutringest.com
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
