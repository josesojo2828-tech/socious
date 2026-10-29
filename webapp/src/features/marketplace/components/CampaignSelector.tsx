'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Palette, Video, Megaphone, Smartphone, X, Loader2, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';
import { campaignPlanService, campaignService } from '../services/marketplace.service';
import { useToastStore } from '@/shared/store/ui/useToastStore';

interface CampaignSelectorProps {
  productId: string;
  productName: string;
  currentBalance: number;
  onClose: () => void;
  onActivated: () => void;
}

export function CampaignSelector({ productId, productName, currentBalance, onClose, onActivated }: CampaignSelectorProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['campaign-plans'],
    queryFn: async () => {
      const data = await campaignPlanService.findAll();
      return data.filter((p) => p.isActive);
    },
    retry: 2,
    staleTime: 30000,
  });

  const activateMutation = useMutation({
    mutationFn: (planId: string) => campaignService.create({ productId, planId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-campaign-statuses'] });
      onActivated();
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Error al activar la campaña';
      addToast({ type: 'error', message: Array.isArray(msg) ? msg[0] : msg });
    },
    onSettled: () => {
      setSelectedPlan(null);
    },
  });

  const handleActivate = (planId: string) => {
    setSelectedPlan(planId);
    activateMutation.mutate(planId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-base-100 rounded-3xl border border-base-300 shadow-2xl w-full max-w-4xl overflow-hidden my-8 transform transition-all">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-base-200 bg-base-200/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base-content text-lg">Activar Campaña Publicitaria</h3>
              <p className="text-xs text-base-content/70">Destaca tu recurso <span className="font-semibold text-base-content">"{productName}"</span> en los primeros lugares.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-base-content/50 hover:text-base-content hover:bg-base-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Wallet Balance Chip */}
          <div className="flex items-center justify-between p-4 bg-base-200 border border-base-300 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <Wallet className="w-5 h-5 text-primary" />
              <span className="text-xs font-bold text-base-content/70 uppercase tracking-wider">Tu Saldo Disponible</span>
            </div>
            <span className="text-lg font-extrabold text-primary font-mono bg-base-100 px-3 py-1 rounded-xl border border-base-300 shadow-xs">
              ${Number(currentBalance).toFixed(2)} USD
            </span>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
              <span className="text-xs text-base-content/70">Cargando planes de promoción...</span>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-12 px-4 bg-base-200 border border-base-300 rounded-2xl space-y-2">
              <Megaphone className="w-10 h-10 mx-auto text-base-content/30" />
              <h4 className="text-sm font-bold text-base-content">No hay planes activos disponibles</h4>
              <p className="text-xs text-base-content/60">Intenta nuevamente más tarde o ponte en contacto con soporte.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {plans.map((plan) => {
                const canAfford = Number(currentBalance) >= Number(plan.price);
                const isSelected = selectedPlan === plan.id;
                const isPending = activateMutation.isPending && isSelected;

                return (
                  <div
                    key={plan.id}
                    className={`relative bg-base-100 rounded-2xl border transition-all duration-300 p-5 flex flex-col justify-between space-y-5 ${
                      canAfford
                        ? 'border-base-300 hover:border-primary hover:shadow-lg cursor-pointer'
                        : 'border-base-300 opacity-60 bg-base-200'
                    }`}
                    onClick={() => canAfford && !activateMutation.isPending && handleActivate(plan.id)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-base-content text-base">{plan.name}</h4>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                          {plan.duration} días
                        </span>
                      </div>

                      <div className="text-2xl font-black text-primary font-mono">
                        ${plan.price} <span className="text-xs font-normal text-base-content/50">USD</span>
                      </div>

                      <ul className="text-xs text-base-content/70 space-y-2 pt-2 border-t border-base-200">
                        {plan.features?.designs > 0 && (
                          <li className="flex items-center gap-2">
                            <Palette className="w-3.5 h-3.5 text-primary" /> {plan.features.designs} diseños gráficos
                          </li>
                        )}
                        {plan.features?.videos > 0 && (
                          <li className="flex items-center gap-2">
                            <Video className="w-3.5 h-3.5 text-secondary" /> {plan.features.videos} videos promocionales
                          </li>
                        )}
                        <li className="flex items-center gap-2">
                          <Megaphone className="w-3.5 h-3.5 text-accent" /> {plan.features?.posts || 0} publicaciones destacadas
                        </li>
                        {plan.features?.socialMedia && (
                          <li className="flex items-center gap-2">
                            <Smartphone className="w-3.5 h-3.5 text-info" /> Difusión en Redes Sociales
                          </li>
                        )}
                      </ul>
                    </div>

                    <div className="pt-2">
                      {canAfford ? (
                        <button
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                            isPending
                              ? 'bg-primary/80 text-primary-content cursor-wait'
                              : 'bg-primary hover:bg-primary/90 text-primary-content shadow-md shadow-primary/20 cursor-pointer'
                          }`}
                          disabled={activateMutation.isPending}
                        >
                          {isPending ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Activando...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Activar Plan
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 py-2 text-error text-xs font-semibold bg-error/10 border border-error/20 rounded-xl">
                          <AlertCircle className="w-3.5 h-3.5" /> Saldo insuficiente
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-base-200 border-t border-base-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-base-content/70 bg-base-100 border border-base-300 hover:bg-base-200 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
