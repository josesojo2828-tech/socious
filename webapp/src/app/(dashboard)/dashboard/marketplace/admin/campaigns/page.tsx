'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/api.client';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { DashboardCard } from '@/features/nutringest/components/DashboardCard';
import { Megaphone, XCircle, User, Package, Calendar, DollarSign, ArrowLeft, Loader2 } from 'lucide-react';

interface Campaign {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  impressions: number;
  clicks: number;
  conversions: number;
  product: { id: string; title: string; type: string };
  plan: { id: string; name: string; price: number };
  seller: { id: string; firstName: string; lastName: string; avatar?: string; image?: string; email?: string };
}

export default function AdminCampaignsPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['marketplace-admin-campaigns'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/marketplace/admin/campaigns');
      return data;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (campaignId: string) =>
      apiClient.patch(`/api/marketplace/admin/campaigns/${campaignId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-admin-campaigns'] });
      addToast({ type: 'success', message: 'Campaña cancelada' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Error al cancelar campaña' });
    },
  });

  const getStatusBadge = (status: string, endDate: string) => {
    const isExpired = new Date(endDate) <= new Date();
    if (isExpired) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-base-200 text-base-content border border-base-300">Expirada</span>;
    
    switch (status) {
      case 'ACTIVE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-base-200 text-base-content border border-base-300">Activa</span>;
      case 'PAUSED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-base-200 text-base-content border border-base-300">Pausada</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-base-200 text-base-content border border-base-300">Cancelada</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-base-200 text-base-content border border-base-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500 font-sans">
      {/* 1. HEADER PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-base-content tracking-tight uppercase">
            TODAS LAS CAMPAÑAS
          </h1>
          <p className="text-base-content/70 text-xs font-medium mt-0.5">
            Monitoreo y administración de las campañas publicitarias activas en la plataforma
          </p>
        </div>
        <Link
          href="/dashboard/marketplace/admin"
          className="inline-flex items-center gap-2 bg-base-200 hover:bg-base-300 text-base-content border border-base-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-all w-fit"
        >
          <ArrowLeft size={16} /> Volver al Admin
        </Link>
      </div>

      {/* 2. MAIN DASHBOARD CARD */}
      <DashboardCard className="p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin mb-2" />
            <span className="text-xs font-semibold text-base-content/70">Cargando campañas...</span>
          </div>
        ) : !campaigns || campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center text-base-content/50 mb-3">
              <Megaphone size={28} />
            </div>
            <h3 className="text-base font-bold text-base-content">No existen registros.</h3>
            <p className="text-xs text-base-content/70 mt-1 max-w-sm">
              No hay campañas publicitarias creadas en este momento.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign: Campaign) => {
              const sellerAvatar = campaign.seller?.avatar || campaign.seller?.image;
              const initials = `${campaign.seller?.firstName?.[0] || 'V'}${campaign.seller?.lastName?.[0] || ''}`;

              return (
                <div
                  key={campaign.id}
                  className="p-5 border border-base-300 rounded-xl bg-base-200 hover:bg-base-100 hover:shadow-sm transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* INFO PRINCIPAL CON SELLER AVATAR */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 border border-purple-500/20">
                          <Package size={16} />
                        </div>
                        <h3 className="font-bold text-base-content text-sm">{campaign.product.title}</h3>
                        {getStatusBadge(campaign.status, campaign.endDate)}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-base-content/70 font-medium pt-1">
                        {/* SELLER INFO */}
                        <div className="flex items-center gap-1.5 bg-base-100 px-2.5 py-1 rounded-lg border border-base-300">
                          {sellerAvatar ? (
                            <img
                              src={sellerAvatar}
                              alt={campaign.seller.firstName}
                              className="w-5 h-5 rounded-full object-cover border border-purple-200"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center">
                              {initials}
                            </div>
                          )}
                          <span className="text-base-content font-bold">
                            {campaign.seller.firstName} {campaign.seller.lastName}
                          </span>
                        </div>

                        <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold">
                          <Megaphone className="w-3.5 h-3.5" />
                          Plan {campaign.plan.name}
                        </span>

                        <span className="flex items-center gap-1 font-mono font-bold text-base-content">
                          <DollarSign className="w-3.5 h-3.5 text-base-content/60" />
                          ${Number(campaign.plan.price).toFixed(2)}
                        </span>

                        <span className="flex items-center gap-1 text-base-content/70">
                          <Calendar className="w-3.5 h-3.5 text-base-content/60" />
                          {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* METRICAS */}
                    <div className="flex items-center gap-3 self-start lg:self-center">
                      <div className="bg-base-100 border border-base-300 rounded-xl px-3.5 py-1.5 text-center min-w-[70px]">
                        <div className="text-xs font-black text-base-content font-mono">{campaign.impressions}</div>
                        <div className="text-[10px] font-bold text-base-content/60 uppercase">Vistas</div>
                      </div>
                      <div className="bg-base-100 border border-base-300 rounded-xl px-3.5 py-1.5 text-center min-w-[70px]">
                        <div className="text-xs font-black text-purple-600 dark:text-purple-400 font-mono">{campaign.clicks}</div>
                        <div className="text-[10px] font-bold text-base-content/60 uppercase">Clics</div>
                      </div>
                      <div className="bg-base-100 border border-base-300 rounded-xl px-3.5 py-1.5 text-center min-w-[70px]">
                        <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">{campaign.conversions}</div>
                        <div className="text-[10px] font-bold text-base-content/60 uppercase">Conv.</div>
                      </div>
                    </div>

                    {/* ACCIONES */}
                    <div className="self-end lg:self-center">
                      {campaign.status === 'ACTIVE' && (
                        <button
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-base-200 text-base-content border border-base-300 hover:bg-base-300 transition-colors cursor-pointer disabled:opacity-50"
                          onClick={() => cancelMutation.mutate(campaign.id)}
                          disabled={cancelMutation.isPending}
                        >
                          <XCircle size={14} /> Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DashboardCard>
    </div>
  );
}

