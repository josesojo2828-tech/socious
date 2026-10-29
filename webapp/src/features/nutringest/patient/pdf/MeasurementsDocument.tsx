import React from 'react';
import { Page, Text, View, Document, StyleSheet, Svg, Line as PdfLine, Circle, Rect, G } from '@react-pdf/renderer';
import {
    calculateFrisanchoComposition,
    type FrisanchoCompositionResult,
} from '../lib/frisancho.engine';

// Estilos para PDF
const styles = StyleSheet.create({
    page: { padding: 25, fontFamily: 'Helvetica' },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#10B981' },
    subtitle: { fontSize: 11, color: 'gray', marginTop: 2 },
    sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#111827', marginBottom: 6, marginTop: 8 },
    card: { padding: 8, backgroundColor: '#F8FAFC', borderRadius: 4, marginBottom: 8, border: '1px solid #E2E8F0' },
    metricCard: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 4, width: '18%' },
    metricLabel: { fontSize: 8, color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center' },
    metricValue: { fontSize: 14, fontWeight: 'bold', color: '#0F172A', textAlign: 'center', marginTop: 2 },
    metricUnit: { fontSize: 8, color: '#10B981', fontWeight: 'bold', textAlign: 'center' },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3, alignItems: 'center' },
    label: { fontSize: 9, color: '#64748B' },
    value: { fontSize: 9, fontWeight: 'bold', color: '#0F172A' },
    refText: { fontSize: 8, color: '#64748B', italic: true },
    tableHeader: { flexDirection: 'row', backgroundColor: '#0F172A', padding: 5, borderRadius: 3, marginBottom: 3 },
    tableHeaderCell: { color: '#FFFFFF', fontSize: 8, fontWeight: 'bold' },
    tableRow: { flexDirection: 'row', padding: 4, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', borderBottomStyle: 'solid', alignItems: 'center' },
    tableCell: { fontSize: 8, color: '#334155' },
    badgeNormal: { backgroundColor: '#D1FAE5', color: '#065F46', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3, fontSize: 7, fontWeight: 'bold' },
    badgeWarning: { backgroundColor: '#FEF3C7', color: '#92400E', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3, fontSize: 7, fontWeight: 'bold' },
    badgeDanger: { backgroundColor: '#FEE2E2', color: '#991B1B', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3, fontSize: 7, fontWeight: 'bold' },
    warning: { fontSize: 8, color: '#B45309', marginTop: 4 },
    footnote: { fontSize: 8, color: 'gray', marginTop: 10, textAlign: 'center' },
});

export interface SomatoComponentDetail {
    level: string;
    description: string;
}

export function getSomatotypeComponentInterpretation(type: 'endo' | 'meso' | 'ecto', val: number): SomatoComponentDetail {
    if (!val || val <= 0) return { level: 'Sin datos', description: 'Sin medición suficiente.' };
    if (val <= 2.5) {
        if (type === 'endo') return { level: 'Bajo (0.5 - 2.5)', description: 'Poca grasa subcutánea. Contornos musculares y óseos visibles.' };
        if (type === 'meso') return { level: 'Bajo (0.5 - 2.5)', description: 'Bajo desarrollo muscular. Diámetros óseos y musculares pequeños.' };
        return { level: 'Bajo (0.5 - 2.5)', description: 'Linealidad de gran volumen por unidad de altura. Extremidades voluminosas.' };
    }
    if (val <= 5.5) {
        if (type === 'endo') return { level: 'Moderado (3 - 5.5)', description: 'Moderada adiposidad relativa. Apariencia más blanda.' };
        if (type === 'meso') return { level: 'Moderado (3 - 5.5)', description: 'Desarrollo músculo-esquelético relativo moderado.' };
        return { level: 'Moderado (3 - 5.5)', description: 'Linealidad relativa moderada. Menos volumen por unidad de altura.' };
    }
    if (val <= 7.0) {
        if (type === 'endo') return { level: 'Alto (5.5 - 7)', description: 'Alta adiposidad relativa. Grasa subcutánea abundante en abdomen.' };
        if (type === 'meso') return { level: 'Alto (5.5 - 7)', description: 'Alto desarrollo músculo-esquelético relativo. Diámetros grandes.' };
        return { level: 'Alto (5.5 - 7)', description: 'Linealidad relativa alta. Poco volumen por unidad de altura.' };
    }
    if (type === 'endo') return { level: 'Muy Alto (7.5+)', description: 'Adiposidad relativa muy alta. Clara acumulación subcutánea.' };
    if (type === 'meso') return { level: 'Muy Alto (7.5+)', description: 'Muy alto desarrollo músculo-esquelético. Músculos y esqueleto muy grandes.' };
    return { level: 'Muy Alto (7.5+)', description: 'Linealidad relativa muy alta. Individuos muy delgados.' };
}

export interface PediatricSummary {
    lei: number;
    phv: number;
    sign: 1 | -1;
    interpretation: string;
    rangeValid: boolean;
}

export interface SportSummary {
    discipline: string;
    category: string;
    method: 'DIRECTO' | 'MET';
    directWeekly?: number;
    metsDaily: number;
    cunninghamRmr: number;
    athleteTotal: number;
    ffm: number;
}

export interface HealthIndex {
    name: string;
    value: string;
    unit: string;
    reference: string;
    interpretation: string;
    level: 'normal' | 'warning' | 'danger';
}

export function calculateHealthIndices(measurement: any, gender: string, weight: number, height: number): HealthIndex[] {
    const indices: HealthIndex[] = [];
    const isMale = gender === 'MALE' || gender === 'MASCULINO';
    
    // 1. Perímetro de Cintura
    const waist = Number(measurement?.waist) || 0;
    if (waist > 0) {
        let level: 'normal' | 'warning' | 'danger' = 'normal';
        let interp = 'Riesgo cardiometabólico bajo';
        const refStr = isMale ? '< 94 cm' : '< 80 cm';
        if (isMale) {
            if (waist >= 102) { level = 'danger'; interp = 'Riesgo cardiometabólico muy alto'; }
            else if (waist >= 94) { level = 'warning'; interp = 'Riesgo cardiometabólico elevado'; }
        } else {
            if (waist >= 88) { level = 'danger'; interp = 'Riesgo cardiometabólico muy alto'; }
            else if (waist >= 80) { level = 'warning'; interp = 'Riesgo cardiometabólico elevado'; }
        }
        indices.push({ name: 'Perímetro Cintura', value: waist.toFixed(1), unit: 'cm', reference: refStr, interpretation: interp, level });
    }

    // 2. ICC
    const hip = Number(measurement?.hip) || 0;
    if (waist > 0 && hip > 0) {
        const icc = waist / hip;
        let level: 'normal' | 'warning' | 'danger' = 'normal';
        let interp = 'Distribución grasa saludable';
        const refStr = isMale ? '< 0.90' : '< 0.85';
        if (isMale) {
            if (icc >= 0.95) { level = 'danger'; interp = 'Riesgo cardiovascular alto'; }
            else if (icc >= 0.90) { level = 'warning'; interp = 'Riesgo cardiovascular moderado'; }
        } else {
            if (icc >= 0.90) { level = 'danger'; interp = 'Riesgo cardiovascular alto'; }
            else if (icc >= 0.85) { level = 'warning'; interp = 'Riesgo cardiovascular moderado'; }
        }
        indices.push({ name: 'Índice Cintura/Cadera (ICC)', value: icc.toFixed(2), unit: '', reference: refStr, interpretation: interp, level });
    }

    // 3. Índice de Conicidad
    if (waist > 0 && weight > 0 && height > 0) {
        const waistM = waist / 100;
        const heightM = height / 100;
        const cIndex = waistM / (0.109 * Math.sqrt(weight / heightM));
        let level: 'normal' | 'warning' | 'danger' = 'normal';
        let interp = 'Acumulación abdominal baja';
        if (cIndex >= 1.25) { level = 'warning'; interp = 'Acumulación grasa central aumentada'; }
        indices.push({ name: 'Índice de Conicidad', value: cIndex.toFixed(2), unit: '', reference: '1.00 - 1.25', interpretation: interp, level });
    }

    // 4. IMC
    const bmi = Number(measurement?.bmi) || (height > 0 && weight > 0 ? weight / Math.pow(height / 100, 2) : 0);
    if (bmi > 0) {
        let level: 'normal' | 'warning' | 'danger' = 'normal';
        let interp = 'Peso Normal';
        if (bmi < 18.5) { level = 'warning'; interp = 'Bajo Peso'; }
        else if (bmi >= 40.0) { level = 'danger'; interp = 'Obesidad Grado III'; }
        else if (bmi >= 35.0) { level = 'danger'; interp = 'Obesidad Grado II'; }
        else if (bmi >= 30.0) { level = 'danger'; interp = 'Obesidad Grado I'; }
        else if (bmi >= 25.0) { level = 'warning'; interp = 'Sobrepeso'; }
        indices.push({ name: 'Índice Masa Corporal (IMC)', value: bmi.toFixed(2), unit: 'kg/m²', reference: '18.5 - 24.9', interpretation: interp, level });
    }

    // 5. Pliegue Abdominal
    const abd = Number(measurement?.abdominal) || 0;
    if (abd > 0) {
        const level = abd >= 15 ? 'warning' : 'normal';
        const interp = abd >= 15 ? 'Adiposidad abdominal elevada' : 'Nivel adiposo óptimo';
        indices.push({ name: 'Pliegue Abdominal', value: abd.toFixed(1), unit: 'mm', reference: '< 15.0 mm', interpretation: interp, level });
    }

    // 6. Pliegue Tríceps
    const tri = Number(measurement?.tricipital) || 0;
    if (tri > 0) {
        const level = tri >= 15 ? 'warning' : 'normal';
        const interp = tri >= 15 ? 'Adiposidad en brazos elevada' : 'Nivel adiposo óptimo';
        indices.push({ name: 'Pliegue Tríceps', value: tri.toFixed(1), unit: 'mm', reference: '< 15.0 mm', interpretation: interp, level });
    }

    // 7. Suma de 6 pliegues (ISAK)
    const foldValues = [
        Number(measurement?.tricipital) || 0,
        Number(measurement?.subscapular) || 0,
        Number(measurement?.skinfoldSupraspinale) || 0,
        Number(measurement?.abdominal) || 0,
        Number(measurement?.thigh) || 0,
        Number(measurement?.calf) || 0,
    ];
    if (foldValues.every((value) => value > 0)) {
        const sum6 = foldValues.reduce((total, value) => total + value, 0);
        indices.push({
            name: 'Suma de 6 Pliegues (ISAK)',
            value: sum6.toFixed(1),
            unit: 'mm',
            reference: 'Comparar con percentiles',
            interpretation: 'Sumatoria ISAK',
            level: 'normal',
        });
    }

    return indices;
}

interface Props {
    patient: any;
    measurement: any;
    age: number;
    pediatricSummary?: PediatricSummary | null;
    sportSummary?: SportSummary | null;
    frisanchoSummary?: FrisanchoCompositionResult | null;
}

const fmt = (value: any, digits: number = 1): string =>
    value === undefined || value === null || isNaN(Number(value)) ? '-' : Number(value).toFixed(digits);

export function getSomatotypeCategory(endo: number, meso: number, ecto: number): string {
    if (!endo || !meso || !ecto || endo <= 0 || meso <= 0 || ecto <= 0) return 'Sin datos suficientes';

    const maxVal = Math.max(endo, meso, ecto);
    const endoDiff = maxVal - endo;
    const mesoDiff = maxVal - meso;
    const ectoDiff = maxVal - ecto;

    if (Math.abs(endo - meso) <= 0.7 && Math.abs(meso - ecto) <= 0.7 && Math.abs(endo - ecto) <= 0.7) {
        return 'Central / Balanceado';
    }

    if (maxVal === endo) {
        if (mesoDiff <= 0.8 && meso > ecto) return 'Mesomorfo-Endomorfo';
        if (ectoDiff <= 0.8 && ecto > meso) return 'Ectomorfo-Endomorfo';
        return 'Endomorfo Puro';
    }

    if (maxVal === meso) {
        if (endoDiff <= 0.8 && endo > ecto) return 'Endomorfo-Mesomorfo';
        if (ectoDiff <= 0.8 && ecto > endo) return 'Ectomorfo-Mesomorfo';
        return 'Mesomorfo Puro';
    }

    if (maxVal === ecto) {
        if (mesoDiff <= 0.8 && meso > endo) return 'Mesomorfo-Ectomorfo';
        if (endoDiff <= 0.8 && endo > meso) return 'Endomorfo-Ectomorfo';
        return 'Ectomorfo Puro';
    }

    return 'Somatotipo Mixto';
}

export const MeasurementsDocument = ({
    patient,
    measurement,
    age,
    pediatricSummary,
    sportSummary,
    frisanchoSummary,
}: Props) => {
    const height = Number(measurement?.height) || 0;
    const sittingHeight = Number(measurement?.sittingHeight) || 0;
    const weight = Number(measurement?.weight) || 0;
    const gender = patient?.gender || 'MALE';
    const isMale = gender === 'MALE' || gender === 'MASCULINO';
    const lei = height > 0 && sittingHeight > 0 ? height - sittingHeight : 0;

    const frisancho = frisanchoSummary !== undefined ? frisanchoSummary : (() => {
        const muac = Number(measurement?.midUpperArmCircumferenceCm ?? measurement?.c_arm_relaxed ?? measurement?.armRelaxed) || 0;
        const tsf = Number(measurement?.tricepsSkinfoldMm ?? measurement?.tricipital) || 0;
        const ageNum = typeof age === 'number' ? age : 0;
        if (muac > 0 && tsf > 0 && ageNum >= 1 && ageNum <= 18) {
            return calculateFrisanchoComposition({
                muacCm: muac,
                tsfMm: tsf,
                gender,
                ageYears: ageNum,
            });
        }
        return null;
    })();

    const endo = Number(measurement?.endomorphy) || 0;
    const meso = Number(measurement?.mesomorphy) || 0;
    const ecto = Number(measurement?.ectomorphy) || 0;
    const hasSomatotype = endo > 0 && meso > 0 && ecto > 0;
    const somatoX = ecto - endo;
    const somatoY = 2 * meso - (endo + ecto);
    const somatoCategory = hasSomatotype ? getSomatotypeCategory(endo, meso, ecto) : null;

    // Componentes
    const latestAdipose = Number(measurement?.adiposeMass ?? measurement?.adiposeMassKg) || 0;
    const latestMuscle = Number(measurement?.muscleMass ?? measurement?.muscleMassKg) || 0;
    const latestBone = Number(measurement?.boneMass ?? measurement?.boneMassKg) || 0;
    const latestResidualRaw = Number(measurement?.residualMass ?? measurement?.residualMassKg) || 0;
    // Kerr/Rocha/Lee están calibrados en adultos: en menores de 18 el residual
    // se omite (igual que el reporte en pantalla) en vez de mostrar un 0.
    const isPediatric = typeof age === 'number' && age > 0 && age < 18;
    const latestResidual = isPediatric ? 0 : latestResidualRaw;
    const hasFractionation = latestAdipose > 0 || latestMuscle > 0 || latestBone > 0 || latestResidualRaw > 0;

    // Índices de salud
    const healthIndices = calculateHealthIndices(measurement, gender, weight, height);

    // Coordenadas para la Somatocarta SVG en PDF (Bounding Box 220x130)
    const svgWidth = 220;
    const svgHeight = 130;
    const originX = 110;
    const originY = 65;
    // Map X (-10 a +10) -> originX + (somatoX / 10) * 90
    // Map Y (-10 a +14) -> originY - (somatoY / 14) * 55
    const dotX = Math.min(Math.max(originX + (somatoX / 10) * 90, 10), svgWidth - 10);
    const dotY = Math.min(Math.max(originY - (somatoY / 14) * 50, 10), svgHeight - 10);

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* Encabezado */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Informe Cineantropométrico</Text>
                        <Text style={styles.subtitle}>Paciente: {patient?.firstName} {patient?.lastName}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 9, color: '#64748B' }}>Fecha de Emisión</Text>
                        <Text style={{ fontSize: 10, fontWeight: 'bold' }}>{new Date().toLocaleDateString()}</Text>
                    </View>
                </View>

                {/* Mediciones Básicas */}
                <Text style={styles.sectionTitle}>1. Mediciones Antropométricas Básicas</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>MC (Peso)</Text>
                        <Text style={styles.metricValue}>{fmt(measurement?.weight, 1)}</Text>
                        <Text style={styles.metricUnit}>kg</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Talla</Text>
                        <Text style={styles.metricValue}>{height > 0 ? fmt(height, 1) : '-'}</Text>
                        <Text style={styles.metricUnit}>cm</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>LEI</Text>
                        <Text style={styles.metricValue}>{lei > 0 ? fmt(lei, 1) : '-'}</Text>
                        <Text style={styles.metricUnit}>cm</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>IMC</Text>
                        <Text style={styles.metricValue}>{fmt(measurement?.bmi, 2)}</Text>
                        <Text style={styles.metricUnit}>kg/m²</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>% Grasa</Text>
                        <Text style={styles.metricValue}>{fmt(measurement?.fatPercentage, 2)}</Text>
                        <Text style={styles.metricUnit}>%</Text>
                    </View>
                </View>

                {/* 2. Fraccionamiento de 4 Componentes con Valores Referenciales */}
                {hasFractionation && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>2. Composición Corporal (Fraccionamiento de 4 Componentes - Kerr)</Text>
                        
                        <View style={styles.tableHeader}>
                            <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Componente Tisular</Text>
                            <Text style={[styles.tableHeaderCell, { width: '30%', textAlign: 'right' }]}>Valor Obtenido</Text>
                            <Text style={[styles.tableHeaderCell, { width: '30%', textAlign: 'right' }]}>Rango Referencial</Text>
                        </View>

                        <View style={styles.tableRow}>
                            <Text style={[styles.tableCell, { width: '40%', fontWeight: 'bold' }]}>Masa Adiposa (Grasa)</Text>
                            <Text style={[styles.tableCell, { width: '30%', textAlign: 'right', fontWeight: 'bold', color: '#D97706' }]}>
                                {latestAdipose.toFixed(2)} kg ({weight > 0 ? ((latestAdipose / weight) * 100).toFixed(1) : '-'}%)
                            </Text>
                            <Text style={[styles.tableCell, { width: '30%', textAlign: 'right', color: '#64748B' }]}>
                                {isMale ? '10% - 20%' : '18% - 28%'}
                            </Text>
                        </View>

                        <View style={styles.tableRow}>
                            <Text style={[styles.tableCell, { width: '40%', fontWeight: 'bold' }]}>Masa Muscular</Text>
                            <Text style={[styles.tableCell, { width: '30%', textAlign: 'right', fontWeight: 'bold', color: '#059669' }]}>
                                {latestMuscle.toFixed(2)} kg ({weight > 0 ? ((latestMuscle / weight) * 100).toFixed(1) : '-'}%)
                            </Text>
                            <Text style={[styles.tableCell, { width: '30%', textAlign: 'right', color: '#64748B' }]}>
                                {isMale ? '40% - 50%' : '30% - 40%'}
                            </Text>
                        </View>

                        <View style={styles.tableRow}>
                            <Text style={[styles.tableCell, { width: '40%', fontWeight: 'bold' }]}>Masa Ósea (Esqueleto)</Text>
                            <Text style={[styles.tableCell, { width: '30%', textAlign: 'right', fontWeight: 'bold', color: '#D97706' }]}>
                                {latestBone.toFixed(2)} kg ({weight > 0 ? ((latestBone / weight) * 100).toFixed(1) : '-'}%)
                            </Text>
                            <Text style={[styles.tableCell, { width: '30%', textAlign: 'right', color: '#64748B' }]}>
                                {isMale ? '12% - 16%' : '10% - 14%'}
                            </Text>
                        </View>

                        {isPediatric ? (
                            <View style={styles.tableRow}>
                                <Text style={[styles.tableCell, { width: '40%', fontWeight: 'bold' }]}>Masa Residual (Órganos)</Text>
                                <Text style={[styles.tableCell, { width: '60%', color: '#B45309' }]}>
                                    Omisión: fórmulas calibradas en adultos, no confiables en menores de 18 años
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.tableRow}>
                                <Text style={[styles.tableCell, { width: '40%', fontWeight: 'bold' }]}>Masa Residual (Órganos)</Text>
                                <Text style={[styles.tableCell, { width: '30%', textAlign: 'right', fontWeight: 'bold', color: '#2563EB' }]}>
                                    {latestResidual.toFixed(2)} kg ({weight > 0 ? ((latestResidual / weight) * 100).toFixed(1) : '-'}%)
                                </Text>
                                <Text style={[styles.tableCell, { width: '30%', textAlign: 'right', color: '#64748B' }]}>
                                    10% - 15%
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* 3. Índices de Salud & Riesgo Cardiometabólico */}
                {healthIndices.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>3. Índices de Salud & Riesgo Cardiometabólico</Text>
                        
                        <View style={styles.tableHeader}>
                            <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Indicador</Text>
                            <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'center' }]}>Valor Paciente</Text>
                            <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'center' }]}>Rango Saludable</Text>
                            <Text style={[styles.tableHeaderCell, { width: '30%', textAlign: 'right' }]}>Interpretación</Text>
                        </View>

                        {healthIndices.map((idx, index) => (
                            <View key={index} style={styles.tableRow}>
                                <Text style={[styles.tableCell, { width: '30%', fontWeight: 'bold' }]}>{idx.name}</Text>
                                <Text style={[styles.tableCell, { width: '20%', textAlign: 'center', fontWeight: 'bold' }]}>
                                    {idx.value} {idx.unit}
                                </Text>
                                <Text style={[styles.tableCell, { width: '20%', textAlign: 'center', color: '#64748B' }]}>
                                    {idx.reference}
                                </Text>
                                <View style={{ width: '30%', alignItems: 'flex-end' }}>
                                    <Text style={
                                        idx.level === 'normal' ? styles.badgeNormal :
                                        idx.level === 'warning' ? styles.badgeWarning : styles.badgeDanger
                                    }>
                                        {idx.interpretation}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* 4. Somatotipo de Heath-Carter con Gráfica Visual e Interpretación */}
                {hasSomatotype && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>4. Somatotipo (Heath-Carter)</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                            {/* SVG Somatocarta */}
                            <View style={{ width: '45%', alignItems: 'center' }}>
                                <Svg height={130} width={200} viewBox="0 0 200 130">
                                    <Rect x={5} y={5} width={190} height={120} fill="#F8FAFC" stroke="#CBD5E1" strokeWidth={1} rx={4} />
                                    {/* Ejes Centrales */}
                                    <PdfLine x1={100} y1={5} x2={100} y2={125} stroke="#64748B" strokeWidth={1.5} />
                                    <PdfLine x1={5} y1={65} x2={195} y2={65} stroke="#64748B" strokeWidth={1.5} />
                                    {/* Punto Paciente */}
                                    <Circle cx={dotX} cy={dotY} r={6} fill="#EF4444" stroke="#FFFFFF" strokeWidth={2} />
                                </Svg>
                            </View>

                            {/* Datos Somatotipo */}
                            <View style={{ width: '55%', justifyContent: 'center' }}>
                                <View style={styles.row}>
                                    <Text style={styles.label}>Endomorfismo (Adiposidad):</Text>
                                    <Text style={styles.value}>{endo.toFixed(1)}</Text>
                                </View>
                                <View style={styles.row}>
                                    <Text style={styles.label}>Mesomorfismo (Muscularidad):</Text>
                                    <Text style={styles.value}>{meso.toFixed(1)}</Text>
                                </View>
                                <View style={styles.row}>
                                    <Text style={styles.label}>Ectomorfismo (Linealidad):</Text>
                                    <Text style={styles.value}>{ecto.toFixed(1)}</Text>
                                </View>
                                <View style={[styles.row, { marginTop: 3 }]}>
                                    <Text style={styles.label}>Coordenadas (X, Y):</Text>
                                    <Text style={styles.value}>({somatoX.toFixed(1)}, {somatoY.toFixed(1)})</Text>
                                </View>
                                <View style={{ marginTop: 3, padding: 4, backgroundColor: '#ECFDF5', borderRadius: 3, border: '1px solid #A7F3D0' }}>
                                    <Text style={{ fontSize: 8, color: '#047857', fontWeight: 'bold' }}>Clasificación Global:</Text>
                                    <Text style={{ fontSize: 9, color: '#065F46', fontWeight: 'bold', marginTop: 1 }}>{somatoCategory}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Interpretación Detallada por Componente */}
                        <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#1E293B', marginTop: 4, marginBottom: 3 }}>
                            Interpretación Clínica por Componente:
                        </Text>

                        <View style={styles.tableHeader}>
                            <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Componente</Text>
                            <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Nivel</Text>
                            <Text style={[styles.tableHeaderCell, { width: '50%' }]}>Descripción Clínica</Text>
                        </View>

                        <View style={styles.tableRow}>
                            <Text style={[styles.tableCell, { width: '25%', fontWeight: 'bold', color: '#B45309' }]}>Endomorfia ({endo.toFixed(1)})</Text>
                            <Text style={[styles.tableCell, { width: '25%', fontWeight: 'bold' }]}>{getSomatotypeComponentInterpretation('endo', endo).level}</Text>
                            <Text style={[styles.tableCell, { width: '50%', color: '#475569' }]}>{getSomatotypeComponentInterpretation('endo', endo).description}</Text>
                        </View>

                        <View style={styles.tableRow}>
                            <Text style={[styles.tableCell, { width: '25%', fontWeight: 'bold', color: '#047857' }]}>Mesomorfia ({meso.toFixed(1)})</Text>
                            <Text style={[styles.tableCell, { width: '25%', fontWeight: 'bold' }]}>{getSomatotypeComponentInterpretation('meso', meso).level}</Text>
                            <Text style={[styles.tableCell, { width: '50%', color: '#475569' }]}>{getSomatotypeComponentInterpretation('meso', meso).description}</Text>
                        </View>

                        <View style={styles.tableRow}>
                            <Text style={[styles.tableCell, { width: '25%', fontWeight: 'bold', color: '#1D4ED8' }]}>Ectomorfia ({ecto.toFixed(1)})</Text>
                            <Text style={[styles.tableCell, { width: '25%', fontWeight: 'bold' }]}>{getSomatotypeComponentInterpretation('ecto', ecto).level}</Text>
                            <Text style={[styles.tableCell, { width: '50%', color: '#475569' }]}>{getSomatotypeComponentInterpretation('ecto', ecto).description}</Text>
                        </View>
                    </View>
                )}

                {/* Resumen Pediátrico */}
                {pediatricSummary && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Resumen Pediatría (Mirwald PHV)</Text>
                        <View style={styles.row}>
                            <Text style={styles.label}>LEI derivada (Talla − TS)</Text>
                            <Text style={styles.value}>{pediatricSummary.lei.toFixed(1)} cm</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Valor PHV</Text>
                            <Text style={styles.value}>
                                {pediatricSummary.sign === 1 ? '+' : '−'}{Math.abs(pediatricSummary.phv).toFixed(1)} años
                            </Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Interpretación</Text>
                            <Text style={styles.value}>{pediatricSummary.interpretation}</Text>
                        </View>
                        {!pediatricSummary.rangeValid && (
                            <Text style={styles.warning}>
                                Edad fuera del rango validado de Mirwald (chicos 13–15.6 / chicas 12–14.9 años). Resultado orientativo.
                            </Text>
                        )}
                    </View>
                )}

                {/* Composición Corporal Pediátrica (Frisancho) */}
                {frisancho && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Composición Corporal Pediátrica (Frisancho)</Text>
                        <View style={styles.row}>
                            <Text style={styles.label}>Masa Muscular ({frisancho.camaCm2 != null ? 'cAMA Heymsfield' : 'AMA'})</Text>
                            <Text style={styles.value}>
                                {frisancho.camaCm2 != null ? `${frisancho.camaCm2.toFixed(1)} cm²` : `${frisancho.amaCm2.toFixed(1)} cm²`} ({frisancho.muscleEvaluation.category})
                            </Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Clasificación Muscular</Text>
                            <Text style={[styles.value, frisancho.muscleEvaluation.severity === 'CRITICAL' ? styles.badgeDanger : frisancho.muscleEvaluation.severity === 'WARNING' ? styles.badgeWarning : styles.badgeNormal]}>
                                {frisancho.muscleEvaluation.classification}
                            </Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Reserva Grasa (AFA)</Text>
                            <Text style={styles.value}>
                                {frisancho.afaCm2.toFixed(1)} cm² ({frisancho.fatEvaluation.category})
                            </Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Clasificación Grasa</Text>
                            <Text style={[styles.value, (frisancho.fatEvaluation.severity === 'CRITICAL' || frisancho.fatEvaluation.severity === 'ALERT') ? styles.badgeDanger : frisancho.fatEvaluation.severity === 'WARNING' ? styles.badgeWarning : styles.badgeNormal]}>
                                {frisancho.fatEvaluation.classification}
                            </Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Índice Graso Braquial (AFI)</Text>
                            <Text style={styles.value}>{frisancho.afiPercent.toFixed(1)}% (TAA: {frisancho.taaCm2.toFixed(1)} cm²)</Text>
                        </View>
                    </View>
                )}

                {/* Resumen Deportista */}
                {sportSummary && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Resumen Deportista ({sportSummary.category})</Text>
                        <View style={styles.row}>
                            <Text style={styles.label}>Disciplina</Text>
                            <Text style={styles.value}>{sportSummary.discipline}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>TDEE Total (Cunningham + gasto)</Text>
                            <Text style={[styles.value, { color: '#059669' }]}>{sportSummary.athleteTotal.toLocaleString()} kcal/día</Text>
                        </View>
                    </View>
                )}

                <Text style={styles.footnote}>
                    Documento generado digitalmente a través de Nutringest® Cloud Platform.
                </Text>

            </Page>
        </Document>
    );
};