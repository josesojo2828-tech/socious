'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Palette, Video, Megaphone, Smartphone, RefreshCw, Clock, ArrowLeft } from 'lucide-react';
import { campaignService, CampaignMetrics as CampaignMetricsType } from '@/features/marketplace/services/marketplace.service';
import { CampaignMetrics } from '@/features/marketplace/components/CampaignMetrics';
import { useToastStore } from '@/shared/store/ui/useToastStore';

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [metrics, setMetrics] = useState<CampaignMetricsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState(false);
  const [extending, setExtending] = useState(false);
  const [extendDays, setExtendDays] = useState(7);
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    loadMetrics();
  }, [params.id]);

  const loadMetrics = async () => {
    try {
      const data = await campaignService.getMetrics(params.id as string);
      setMetrics(data);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async () => {
    if (!metrics) return;
    setRenewing(true);
    try {
      await campaignService.renew(metrics.id);
      addToast({ type: 'success', message: 'Campaña renovada exitosamente' });
      loadMetrics();
    } catch (error: any) {
      addToast({ type: 'error', message: error.response?.data?.message || 'Error al renovar campaña' });
    } finally {
      setRenewing(false);
    }
  };

  const handleExtend = async () => {
    if (!metrics) return;
    setExtending(true);
    try {
      await campaignService.extend(metrics.id, extendDays);
      addToast({ type: 'success', message: `Campaña extendida por ${extendDays} días` });
      loadMetrics();
    } catch (error: any) {
      addToast({ type: 'error', message: error.response?.data?.message || 'Error al extender campaña' });
    } finally {
      setExtending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-base-content/70">Campaña no encontrada</p>
          <Link href="/dashboard/marketplace/campaigns" className="btn btn-primary mt-4">
            Volver a mis campañas
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = metrics.status === 'EXPIRED' || metrics.isExpired;
  const isActive = metrics.status === 'ACTIVE' && !metrics.isExpired;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base-content">{metrics.product.title}</h1>
          <p className="text-base-content/70">Detalle de campaña publicitaria</p>
        </div>
        <Link href="/dashboard/marketplace/campaigns" className="btn btn-ghost text-base-content">
          <ArrowLeft size={16} /> Volver
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card bg-base-100 border border-base-300 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-base-content">Información de la Campaña</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-base-content/70 text-sm">Plan</span>
                  <p className="font-bold text-base-content">{metrics.plan.name}</p>
                </div>
                <div>
                  <span className="text-base-content/70 text-sm">Costo</span>
                  <p className="font-bold text-base-content">${Number(metrics.plan.price).toFixed(2)} USD</p>
                </div>
                <div>
                  <span className="text-base-content/70 text-sm">Inicio</span>
                  <p className="text-base-content">{new Date(metrics.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-base-content/70 text-sm">Fin</span>
                  <p className="text-base-content">{new Date(metrics.endDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="divider"></div>

              <h3 className="font-bold mb-2 text-base-content">Incluido en el plan:</h3>
              <ul className="text-sm space-y-1 text-base-content/80">
                <li className="flex items-center gap-2"><Palette size={14} /> {metrics.plan.designs} diseños</li>
                <li className="flex items-center gap-2"><Video size={14} /> {metrics.plan.videos} videos</li>
                <li className="flex items-center gap-2"><Megaphone size={14} /> {metrics.plan.posts} publicaciones</li>
                {metrics.plan.socialMedia && <li className="flex items-center gap-2"><Smartphone size={14} /> Publicidad en redes sociales</li>}
              </ul>

              {/* Campaign Actions */}
              <div className="divider"></div>
              
              {isExpired && (
                <div className="space-y-4">
                  <div className="alert alert-warning">
                    <Clock size={16} />
                    <span>Esta campaña ha expirado. Puedes renovarla para activarla nuevamente.</span>
                  </div>
                  <button
                    className="btn btn-primary gap-2"
                    onClick={handleRenew}
                    disabled={renewing}
                  >
                    {renewing ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      <RefreshCw size={16} />
                    )}
                    Renovar Campaña (${Number(metrics.plan.price).toFixed(2)} USD)
                  </button>
                </div>
              )}

              {isActive && (
                <div className="space-y-4">
                  <div className="alert alert-info">
                    <Clock size={16} />
                    <span>Extiende tu campaña para mantenerla activa más tiempo.</span>
                  </div>
                  <div className="flex items-end gap-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Días a extender</span>
                      </label>
                      <select
                        className="select select-bordered"
                        value={extendDays}
                        onChange={(e) => setExtendDays(Number(e.target.value))}
                      >
                        <option value={7}>7 días</option>
                        <option value={14}>14 días</option>
                        <option value={30}>30 días</option>
                      </select>
                    </div>
                    <button
                      className="btn btn-secondary gap-2"
                      onClick={handleExtend}
                      disabled={extending}
                    >
                      {extending ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : (
                        <Clock size={16} />
                      )}
                      Extender
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <CampaignMetrics campaignId={metrics.id} />
        </div>
      </div>
    </div>
  );
}
