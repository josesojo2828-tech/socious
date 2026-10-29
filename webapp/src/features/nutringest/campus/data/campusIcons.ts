"use client";

import React from "react";
import {
  Droplets,
  Activity,
  Heart,
  Zap,
  Baby,
  Stethoscope,
  Calculator,
  Brain,
  BookOpen,
  Dumbbell,
  Apple,
  ClipboardList,
  Utensils,
  Flame,
  Award,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface CampusIconItem {
  id: string;
  name: string;
  category: string;
  bgGradient: string;
  iconColor: string;
  borderClass: string;
  IconComponent: LucideIcon;
  emojiFallback: string;
}

export class CampusIconLibrary {
  // Catálogo curado de íconos SVG clínicos y educativos Nutringest
  static readonly ICONS: CampusIconItem[] = [
    {
      id: "hydration",
      name: "Hidratación & Balance",
      category: "Hidratación",
      bgGradient: "from-cyan-500/10 to-blue-500/20 text-cyan-600",
      iconColor: "text-cyan-500",
      borderClass: "border-cyan-200 hover:border-cyan-400",
      IconComponent: Droplets,
      emojiFallback: "💧",
    },
    {
      id: "antropometria",
      name: "Antropometría & Composición",
      category: "Porciones & Antropometría",
      bgGradient: "from-emerald-500/10 to-teal-500/20 text-emerald-600",
      iconColor: "text-emerald-500",
      borderClass: "border-emerald-200 hover:border-emerald-400",
      IconComponent: Activity,
      emojiFallback: "📊",
    },
    {
      id: "habitos",
      name: "Hábitos & Estilo de Vida",
      category: "Hábitos",
      bgGradient: "from-purple-500/10 to-pink-500/20 text-purple-600",
      iconColor: "text-purple-500",
      borderClass: "border-purple-200 hover:border-purple-400",
      IconComponent: Heart,
      emojiFallback: "🌸",
    },
    {
      id: "deporte",
      name: "Nutrición Deportiva & Rendimiento",
      category: "Nutrición Deportiva",
      bgGradient: "from-amber-500/10 to-orange-500/20 text-amber-600",
      iconColor: "text-amber-500",
      borderClass: "border-amber-200 hover:border-amber-400",
      IconComponent: Zap,
      emojiFallback: "⚡",
    },
    {
      id: "pediatria",
      name: "Pediatría & Crecimiento",
      category: "Pediatría",
      bgGradient: "from-rose-500/10 to-pink-500/20 text-rose-600",
      iconColor: "text-rose-500",
      borderClass: "border-rose-200 hover:border-rose-400",
      IconComponent: Baby,
      emojiFallback: "👶",
    },
    {
      id: "clinica",
      name: "Diagnóstico Clínico & Fichas",
      category: "Clínica",
      bgGradient: "from-indigo-500/10 to-blue-500/20 text-indigo-600",
      iconColor: "text-indigo-500",
      borderClass: "border-indigo-200 hover:border-indigo-400",
      IconComponent: Stethoscope,
      emojiFallback: "🩺",
    },
    {
      id: "calculadora",
      name: "Cálculos & Fórmulas",
      category: "Herramientas",
      bgGradient: "from-teal-500/10 to-emerald-500/20 text-teal-600",
      iconColor: "text-teal-500",
      borderClass: "border-teal-200 hover:border-teal-400",
      IconComponent: Calculator,
      emojiFallback: "🧮",
    },
    {
      id: "neuro",
      name: "Neuro & Conducta Alimentaria",
      category: "Hábitos",
      bgGradient: "from-violet-500/10 to-purple-500/20 text-violet-600",
      iconColor: "text-violet-500",
      borderClass: "border-violet-200 hover:border-violet-400",
      IconComponent: Brain,
      emojiFallback: "🧠",
    },
    {
      id: "guias",
      name: "Manuales & Guías",
      category: "Educación",
      bgGradient: "from-blue-500/10 to-indigo-500/20 text-blue-600",
      iconColor: "text-blue-500",
      borderClass: "border-blue-200 hover:border-blue-400",
      IconComponent: BookOpen,
      emojiFallback: "📚",
    },
    {
      id: "fitness",
      name: "Fuerza & Suplementación",
      category: "Nutrición Deportiva",
      bgGradient: "from-emerald-600/10 to-lime-500/20 text-emerald-700",
      iconColor: "text-emerald-600",
      borderClass: "border-emerald-300 hover:border-emerald-500",
      IconComponent: Dumbbell,
      emojiFallback: "🏋️",
    },
    {
      id: "nutricion",
      name: "Alimentos & Propiedades",
      category: "Nutrición",
      bgGradient: "from-red-500/10 to-orange-500/20 text-red-600",
      iconColor: "text-red-500",
      borderClass: "border-red-200 hover:border-red-400",
      IconComponent: Apple,
      emojiFallback: "🍎",
    },
    {
      id: "evaluacion",
      name: "Evaluación Nutricional",
      category: "Clínica",
      bgGradient: "from-slate-700/10 to-slate-900/20 text-slate-700",
      iconColor: "text-slate-700",
      borderClass: "border-slate-200 hover:border-slate-400",
      IconComponent: ClipboardList,
      emojiFallback: "📋",
    },
  ];

  static getById(id: string): CampusIconItem {
    return (
      this.ICONS.find((item) => item.id === id) || this.ICONS[0]
    );
  }

  static getByCategory(category: string): CampusIconItem {
    return (
      this.ICONS.find((item) => item.category === category) || this.ICONS[0]
    );
  }
}

export default CampusIconLibrary;
