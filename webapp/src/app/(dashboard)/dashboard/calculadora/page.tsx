"use client";

import { Calculator, Activity, Baby } from "lucide-react";
import { Tabs } from "@/shared/components/organisms/Tabs";
import { PatientTab } from "@/features/calculadora/components/PatientTab";
import { SportsTab } from "@/features/calculadora/components/SportsTab";
import { PediatricTab } from "@/features/calculadora/components/PediatricTab";

export default function DashboardCalculadoraPage() {
  return (
    <div className="space-y-6 pb-10 font-sans text-slate-600">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="text-blue-600" />
            Calculadora Nutricional
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Herramientas de precisión clínica: macros, deporte y crecimiento pediátrico.
          </p>
        </div>
      </div>

      {/* TABS */}
      <Tabs
        defaultValue="pacientes"
        variant="bordered"
        items={[
          {
            label: "Pacientes · Macros",
            value: "pacientes",
            icon: Calculator,
            content: <PatientTab />,
          },
          {
            label: "Deportistas",
            value: "deportistas",
            icon: Activity,
            content: <SportsTab />,
          },
          {
            label: "Pediatría",
            value: "pediatria",
            icon: Baby,
            content: <PediatricTab />,
          },
        ]}
      />
    </div>
  );
}