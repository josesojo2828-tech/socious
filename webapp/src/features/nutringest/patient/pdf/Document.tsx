import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

// Estilos similares a CSS pero para PDF
const styles = StyleSheet.create({
    page: { padding: 30, fontFamily: 'Helvetica' },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#10B981' }, // Color Emerald
    section: { margin: 10, padding: 10, flexGrow: 1 },
    card: { padding: 10, backgroundColor: '#F3F4F6', borderRadius: 5, marginBottom: 10 },
    mealTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
    foodItem: { fontSize: 12, flexDirection: 'row', justifyContent: 'space-between' },
});

interface Props {
    plan: any;
}

// Recibe los datos del plan como props
export const PlanDocument = ({ plan }: Props) => (
    <Document>
        <Page size="A4" style={styles.page}>

            {/* Encabezado */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Plan Nutricional</Text>
                    <Text style={{ fontSize: 12, color: 'gray' }}>Paciente: {plan.patient.firstName}</Text>
                </View>
                <View>
                    <Text style={{ fontSize: 10 }}>Fecha: {new Date().toLocaleDateString()}</Text>
                </View>
            </View>

            {/* Resumen Macros (Ejemplo visual) */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <View style={[styles.card, { width: '30%' }]}>
                    <Text style={{ textAlign: 'center', color: '#EF4444' }}>Proteína: {plan.proteinTarget}g</Text>
                </View>
                <View style={[styles.card, { width: '30%' }]}>
                    <Text style={{ textAlign: 'center', color: '#10B981' }}>Carbos: {plan.carbsTarget}g</Text>
                </View>
                <View style={[styles.card, { width: '30%' }]}>
                    <Text style={{ textAlign: 'center', color: '#F59E0B' }}>Grasas: {plan.fatsTarget}g</Text>
                </View>
            </View>

            {/* Lista de Menús */}
            {plan.assignedMenus.map((assigned: any, index: any) => (
                <View key={index} style={styles.card}>
                    <Text style={styles.mealTitle}>{assigned.menu.name} ({assigned.eatingMoment})</Text>
                    {assigned.menu.items.map((item: any, i: number) => (
                        <View key={i} style={styles.foodItem}>
                            <Text>• {item.food.name}</Text>
                            <Text>{item.quantity} {item.unit}</Text>
                        </View>
                    ))}
                </View>
            ))}

        </Page>
    </Document>
);