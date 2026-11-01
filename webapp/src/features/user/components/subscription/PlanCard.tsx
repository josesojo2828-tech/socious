import { Check, X } from "lucide-react";
import type { SubscriptionPlan, SubscriptionPlanContent } from "@/types/backend/schema.types";

/** PlanCard also renders the optional `limitations` bullets the API may include. */
type PlanCardPlan = Omit<SubscriptionPlan, "content"> & {
  content: SubscriptionPlanContent & { limitations?: string[] };
};

export const PlanCard = ({ plan, isCurrent, isPopular }: { plan: PlanCardPlan, isCurrent: boolean, isPopular: boolean }) => {
  return (
    <div className={`relative flex flex-col p-6 rounded-2xl transition-all duration-300 ${isCurrent ? 'bg-base-100 border-2 border-primary shadow-lg ring-4 ring-primary/5' : 'bg-base-100 border border-base-200 hover:border-base-300 hover:shadow-md'}`}>
      
      {isPopular && !isCurrent && (
        <div className="absolute top-0 right-0 -mt-3 mr-4">
          <span className="badge badge-secondary text-xs font-bold uppercase tracking-wider shadow-sm">Popular</span>
        </div>
      )}

      {isCurrent && (
        <div className="absolute top-0 right-0 -mt-3 mr-4">
           <span className="badge badge-primary text-xs font-bold uppercase tracking-wider shadow-sm">Plan Actual</span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-bold text-base-content">{plan.name}</h3>
        <p className="text-xs text-base-content/60 mt-1 min-h-[40px]">{plan.description}</p>
      </div>

      <div className="flex items-baseline gap-1 mb-6">
        <span className="text-4xl font-extrabold text-base-content tracking-tight">
          {plan.price === 0 ? 'Gratis' : `$${plan.price}`}
        </span>
        {plan.price > 0 && <span className="text-sm text-base-content/50 font-medium">/mes</span>}
      </div>

      <div className="flex-1 space-y-3 mb-8">
        {plan.content.features.map((feature, idx) => (
          <div key={idx} className="flex items-start gap-3 text-sm">
            <div className="mt-0.5 p-0.5 rounded-full bg-success/10 text-success">
              <Check size={12} strokeWidth={3} />
            </div>
            <span className="text-base-content/80">{feature}</span>
          </div>
        ))}
        {plan.content.limitations?.map((limit, idx) => (
          <div key={`lim-${idx}`} className="flex items-start gap-3 text-sm opacity-50">
            <div className="mt-0.5 p-0.5 rounded-full bg-base-300 text-base-content/50">
              <X size={12} strokeWidth={3} />
            </div>
            <span>{limit}</span>
          </div>
        ))}
      </div>

      <button 
        className={`btn w-full ${isCurrent ? 'btn-ghost border-base-300 bg-base-200/50 cursor-default hover:bg-base-200' : 'btn-outline border-base-300 hover:border-primary hover:text-primary hover:bg-primary/5'}`}
        disabled={isCurrent}
      >
        {isCurrent ? 'Plan Activo' : 'Seleccionar Plan'}
      </button>
    </div>
  );
};