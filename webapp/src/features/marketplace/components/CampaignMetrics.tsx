'use client';

import { useState, useEffect } from 'react';
import { campaignService, CampaignMetrics as CampaignMetricsType } from '../services/marketplace.service';

interface CampaignMetricsProps {
  campaignId: string;
}

export function CampaignMetrics({ campaignId }: CampaignMetricsProps) {
  const [metrics, setMetrics] = useState<CampaignMetricsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [campaignId]);

  const loadMetrics = async () => {
    try {
      const data = await campaignService.getMetrics(campaignId);
      setMetrics(data);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <span className="loading loading-spinner"></span>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const getStatusBadge = () => {
    if (metrics.isExpired) {
      return <div className="badge badge-error">Expirada</div>;
    }
    switch (metrics.status) {
      case 'ACTIVE': return <div className="badge badge-success">Activa</div>;
      case 'PAUSED': return <div className="badge badge-warning">Pausada</div>;
      case 'CANCELLED': return <div className="badge badge-error">Cancelada</div>;
      default: return <div className="badge">{metrics.status}</div>;
    }
  };

  return (
    <div className="bg-base-200 border border-base-300 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-bold text-base-content">Métricas de Campaña</h4>
        {getStatusBadge()}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="stat bg-base-100 rounded-box border border-base-300">
          <div className="stat-title text-base-content/70">Impresiones</div>
          <div className="stat-value text-2xl text-base-content">{metrics.impressions.toLocaleString()}</div>
        </div>
        <div className="stat bg-base-100 rounded-box border border-base-300">
          <div className="stat-title text-base-content/70">Clics</div>
          <div className="stat-value text-2xl text-base-content">{metrics.clicks.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <span className="text-base-content/70 text-sm">CTR (Click-Through Rate)</span>
          <p className="font-bold text-base-content">{metrics.ctr}%</p>
        </div>
        <div>
          <span className="text-base-content/70 text-sm">Días restantes</span>
          <p className="font-bold text-base-content">{metrics.daysRemaining}</p>
        </div>
      </div>

      <div className="divider"></div>

      <div className="text-sm text-base-content/70">
        <p>Plan: {metrics.plan.name} - ${Number(metrics.plan.price).toFixed(2)}</p>
        <p>Inicio: {new Date(metrics.startDate).toLocaleDateString()}</p>
        <p>Fin: {new Date(metrics.endDate).toLocaleDateString()}</p>
      </div>
    </div>
  );
}
