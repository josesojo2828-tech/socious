'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Megaphone, ArrowRight, Loader2, BarChart2, Eye, MousePointer, TrendingUp, Calendar, Package, XCircle } from 'lucide-react';
import { campaignService, MarketCampaign } from '@/features/marketplace/services/marketplace.service';
import { MarketplaceGuard } from '@/shared/components/guards/MarketplaceGuard';
import { DashboardCard } from '@/features/nutringest/components/DashboardCard';

export default function MyCampaignsPage() {
  const [campaigns, setCampaigns] = useState<MarketCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const data = await campaignService.findMyCampaigns();
      setCampaigns(data);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, endDate: string) => {
    const isExpired = new Date(endDate) <= new Date();
    if (isExpired) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-base-200 text-base-content border border-base-300">
          Expirada
        </span>
      );
    }
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-base-200 text-base-content border border-base-300">
            Activa
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-base-200 text-base-content border border-base-300">
            Pausada
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-base-200 text-base-content border border-base-300">
            Cancelada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-base-200 text-base-content border border-base-300">
            {status}
          </span>
        );
    }
  };

  // Metrics
  const activeCount = campaigns.filter(c => c.status === 'ACTIVE').length;
  const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0);

  return (
    <MarketplaceGuard>
      <div className="space-y-6 pb-12 animate-in fade-in duration-500 font-sans">
        {/* 1. PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-base-content tracking-tight uppercase">
              MIS CAMPAÑAS
            </h1>
            <p className="text-base-content/70 text-xs font-medium mt-0.5">
              Monitorea el rendimiento publicitario de tus promociones activas
            </p>
          </div>
          <Link
            href="/dashboard/marketplace/products"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-content text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer w-fit"
          >
            Ver mis productos <ArrowRight size={16} />
          </Link>
        </div>

        {/* 2. STATS CARDS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCard className="p-5 flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-base-content/70 text-xs font-bold uppercase tracking-wider mb-1">CAMPAÑAS ACTIVAS</p>
              <h3 className="text-2xl font-black text-base-content">{activeCount}</h3>
              <div className="flex items-center mt-2 text-xs font-medium text-base-content/70">
                <span className="bg-primary/10 px-2 py-0.5 rounded text-primary font-semibold">En rotación</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <Megaphone size={22} />
            </div>
          </DashboardCard>

          <DashboardCard className="p-5 flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-base-content/70 text-xs font-bold uppercase tracking-wider mb-1">IMPRESIONES</p>
              <h3 className="text-2xl font-black text-base-content">{totalImpressions.toLocaleString()}</h3>
              <div className="flex items-center mt-2 text-xs font-medium text-base-content/70">
                <span className="bg-info/10 px-2 py-0.5 rounded text-info font-semibold">Visualizaciones</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-info/10 text-info">
              <Eye size={22} />
            </div>
          </DashboardCard>

          <DashboardCard className="p-5 flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-base-content/70 text-xs font-bold uppercase tracking-wider mb-1">CLICS</p>
              <h3 className="text-2xl font-black text-base-content">{totalClicks.toLocaleString()}</h3>
              <div className="flex items-center mt-2 text-xs font-medium text-base-content/70">
                <span className="bg-warning/10 px-2 py-0.5 rounded text-warning font-semibold">Interacciones</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-warning/10 text-warning">
              <MousePointer size={22} />
            </div>
          </DashboardCard>

          <DashboardCard className="p-5 flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-base-content/70 text-xs font-bold uppercase tracking-wider mb-1">CONVERSIONES</p>
              <h3 className="text-2xl font-black text-base-content">{totalConversions.toLocaleString()}</h3>
              <div className="flex items-center mt-2 text-xs font-medium text-base-content/70">
                <span className="bg-success/10 px-2 py-0.5 rounded text-success font-semibold">Ventas directas</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-success/10 text-success">
              <TrendingUp size={22} />
            </div>
          </DashboardCard>
        </div>

        {/* 3. MAIN DASHBOARD CARD CONTAINER */}
        <DashboardCard className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
              <span className="text-xs font-semibold text-base-content/70">Cargando tus campañas...</span>
            </div>
          ) : campaigns.length === 0 ? (
            /* NUTRINGEST STANDARD EMPTY STATE */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center text-base-content/50 mb-3">
                <XCircle size={28} />
              </div>
              <h3 className="text-base font-bold text-base-content">No existen registros.</h3>
              <p className="text-xs text-base-content/70 mt-1 max-w-sm">
                No tienes campañas publicitarias activas en este momento.
              </p>
              <Link
                href="/dashboard/marketplace/products"
                className="mt-4 inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-content text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
              >
                Promocionar un producto
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="p-5 border border-base-300 rounded-xl bg-base-200 hover:bg-base-100 hover:shadow-sm transition-all space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-3 border-b border-base-300">
                    <div className="flex items-center gap-3">
                      {campaign.product.coverUrl ? (
                        <img
                          src={campaign.product.coverUrl}
                          alt={campaign.product.title}
                          className="w-12 h-12 rounded-lg object-cover border border-base-300"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                          <Package size={20} />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-base-content text-sm">{campaign.product.title}</h3>
                        <p className="text-xs text-base-content/70 mt-0.5">
                          Plan: <span className="font-semibold text-base-content">{campaign.plan.name}</span> — ${campaign.plan.price}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {getStatusBadge(campaign.status, campaign.endDate)}
                      <Link
                        href={`/dashboard/marketplace/campaigns/${campaign.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-base-100 text-base-content border border-base-300 hover:bg-base-200 transition-colors"
                      >
                        <BarChart2 size={14} /> Métricas
                      </Link>
                    </div>
                  </div>

                  {/* METRICS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-base-100 border border-base-300 rounded-lg p-3 flex items-center gap-3">
                      <div className="p-2 bg-primary/10 text-primary rounded-md">
                        <Eye size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] text-base-content/60 font-bold uppercase tracking-wider">Impresiones</span>
                        <h4 className="text-sm font-bold text-base-content font-mono">{campaign.impressions.toLocaleString()}</h4>
                      </div>
                    </div>

                    <div className="bg-base-100 border border-base-300 rounded-lg p-3 flex items-center gap-3">
                      <div className="p-2 bg-warning/10 text-warning rounded-md">
                        <MousePointer size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] text-base-content/60 font-bold uppercase tracking-wider">Clics</span>
                        <h4 className="text-sm font-bold text-base-content font-mono">{campaign.clicks.toLocaleString()}</h4>
                      </div>
                    </div>

                    <div className="bg-base-100 border border-base-300 rounded-lg p-3 flex items-center gap-3">
                      <div className="p-2 bg-success/10 text-success rounded-md">
                        <TrendingUp size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] text-base-content/60 font-bold uppercase tracking-wider">Conversiones</span>
                        <h4 className="text-sm font-bold text-base-content font-mono">{campaign.conversions.toLocaleString()}</h4>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-base-content/60 flex items-center gap-1.5 pt-1">
                    <Calendar size={12} className="text-base-content/60" />
                    <span>Período: {new Date(campaign.startDate).toLocaleDateString()} — {new Date(campaign.endDate).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>
    </MarketplaceGuard>
  );
}
