"use client";

import { Input } from "@/shared/components/atoms/Input";
import { Textarea } from "@/shared/components/atoms/Textarea";
import { Button } from "@/shared/components/atoms/Button";
import { Plus, Trash2 } from "lucide-react";
import type { PricingContent, PricingPlan } from "@/features/portfolio/widgets/types";

interface PricingEditorProps {
  content: PricingContent;
  onChange: (content: PricingContent) => void;
}

export function PricingEditor({ content, onChange }: PricingEditorProps) {
  const addPlan = () => {
    const newPlan: PricingPlan = { name: "", price: "", features: [], ctaText: "", ctaLink: "" };
    onChange({ ...content, plans: [...content.plans, newPlan] });
  };

  const removePlan = (index: number) => {
    onChange({ ...content, plans: content.plans.filter((_, i) => i !== index) });
  };

  const updatePlan = (index: number, field: keyof PricingPlan, value: any) => {
    const plans = content.plans.map((plan, i) =>
      i === index ? { ...plan, [field]: value } : plan
    );
    onChange({ ...content, plans });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título de la sección</label>
        <Input value={content.title ?? ""} onChange={(e) => onChange({ ...content, title: e.target.value })} placeholder="Ej: Planes" />
      </div>
      <div className="space-y-3">
        {content.plans.map((plan, i) => (
          <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Plan #{i + 1}</span>
              <button type="button" onClick={() => removePlan(i)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <Input value={plan.name} onChange={(e) => updatePlan(i, "name", e.target.value)} placeholder="Nombre del plan" />
            <Input value={plan.price} onChange={(e) => updatePlan(i, "price", e.target.value)} placeholder="Ej: $45 / mes" />
            <div>
              <label className="block text-xs text-slate-500 mb-1">Características (una por línea)</label>
              <Textarea value={plan.features.join("\n")} onChange={(e) => updatePlan(i, "features", e.target.value.split("\n"))} rows={3} placeholder="Característica 1&#10;Característica 2&#10;Característica 3" />
            </div>
            <Input value={plan.ctaText ?? ""} onChange={(e) => updatePlan(i, "ctaText", e.target.value)} placeholder="Texto del botón" />
            <Input value={plan.ctaLink ?? ""} onChange={(e) => updatePlan(i, "ctaLink", e.target.value)} placeholder="URL del botón" />
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={addPlan} className="w-full">
        <Plus className="w-4 h-4" />
        Agregar plan
      </Button>
    </div>
  );
}
