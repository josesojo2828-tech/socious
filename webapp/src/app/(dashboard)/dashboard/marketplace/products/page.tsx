'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMyProducts } from '@/features/marketplace/hooks/useProducts';
import { ProductFormModal } from '@/features/marketplace/components/ProductFormModal';
import { CampaignSelector } from '@/features/marketplace/components/CampaignSelector';
import { campaignService, walletPaymentService } from '@/features/marketplace/services/marketplace.service';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { MarketplaceGuard } from '@/shared/components/guards/MarketplaceGuard';
import { DashboardCard } from '@/features/nutringest/components/DashboardCard';
import { Megaphone, Plus, Eye, Package, Loader2, CheckCircle2, FileEdit, Search, XCircle } from 'lucide-react';

const statusLabels: Record<string, string> = {
  DRAFT: 'Borrador',
  PENDING_APPROVAL: 'Pendiente',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
};

const statusBadgeStyles: Record<string, string> = {
  DRAFT: 'bg-base-200 text-base-content/80 border-base-300',
  PENDING_APPROVAL: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  APPROVED: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  REJECTED: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  PUBLISHED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  ARCHIVED: 'bg-base-300 text-base-content/60 border-base-300',
};

export default function MyProductsPage() {
  const { data: products, isLoading } = useMyProducts();
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; title: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  // Fetch wallet balance
  const { data: walletData } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: () => walletPaymentService.getBalance(),
  });

  // Fetch campaign statuses for all products
  const { data: campaignStatuses } = useQuery({
    queryKey: ['marketplace-campaign-statuses', products?.map((p: any) => p.id)],
    queryFn: async () => {
      if (!products || products.length === 0) return {};
      const statuses: Record<string, boolean> = {};
      await Promise.all(
        products.map(async (product: any) => {
          try {
            const result = await campaignService.getProductCampaignStatus(product.id);
            statuses[product.id] = result.hasActiveCampaign;
          } catch {
            statuses[product.id] = false;
          }
        })
      );
      return statuses;
    },
    enabled: !!products && products.length > 0,
  });

  const handleOpenCampaignSelector = (product: { id: string; title: string }) => {
    setSelectedProduct(product);
  };

  // Metrics
  const totalCount = products?.length || 0;
  const publishedCount = products?.filter((p: any) => p.status === 'PUBLISHED').length || 0;
  const draftCount = products?.filter((p: any) => p.status === 'DRAFT').length || 0;
  const campaignActiveCount = Object.values(campaignStatuses || {}).filter(Boolean).length;

  // Filtered Products
  const filteredProducts = products?.filter((product: any) => {
    const matchesSearch = !searchTerm || product.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !selectedStatus || product.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <MarketplaceGuard>
      <div className="space-y-6 pb-12 animate-in fade-in duration-500 font-sans">
        {/* 1. PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-base-content tracking-tight uppercase">
              MIS PRODUCTOS
            </h1>
            <p className="text-base-content/70 text-xs font-medium mt-0.5">
              Gestiona tus recursos clínicos y promociona tu catálogo digital
            </p>
          </div>
          <Link
            href="/dashboard/marketplace/products/new"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-content text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer w-fit"
          >
            <Plus size={16} /> Crear Producto
          </Link>
        </div>

        {/* 2. STATS CARDS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCard className="p-5 flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-base-content/70 text-xs font-bold uppercase tracking-wider mb-1">TOTAL PRODUCTOS</p>
              <h3 className="text-2xl font-black text-base-content">{totalCount}</h3>
              <div className="flex items-center mt-2 text-xs font-medium text-base-content/70">
                <span className="bg-purple-500/10 px-2 py-0.5 rounded text-purple-600 dark:text-purple-400 font-semibold">En cuenta</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Package size={22} />
            </div>
          </DashboardCard>

          <DashboardCard className="p-5 flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-base-content/70 text-xs font-bold uppercase tracking-wider mb-1">PUBLICADOS</p>
              <h3 className="text-2xl font-black text-base-content">{publishedCount}</h3>
              <div className="flex items-center mt-2 text-xs font-medium text-base-content/70">
                <span className="bg-emerald-500/10 px-2 py-0.5 rounded text-emerald-600 dark:text-emerald-400 font-semibold">Visibles</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={22} />
            </div>
          </DashboardCard>

          <DashboardCard className="p-5 flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-base-content/70 text-xs font-bold uppercase tracking-wider mb-1">BORRADORES</p>
              <h3 className="text-2xl font-black text-base-content">{draftCount}</h3>
              <div className="flex items-center mt-2 text-xs font-medium text-base-content/70">
                <span className="bg-amber-500/10 px-2 py-0.5 rounded text-amber-600 dark:text-amber-400 font-semibold">Pendientes</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <FileEdit size={22} />
            </div>
          </DashboardCard>

          <DashboardCard className="p-5 flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-base-content/70 text-xs font-bold uppercase tracking-wider mb-1">CAMPAÑAS ACTIVAS</p>
              <h3 className="text-2xl font-black text-base-content">{campaignActiveCount}</h3>
              <div className="flex items-center mt-2 text-xs font-medium text-base-content/70">
                <span className="bg-blue-500/10 px-2 py-0.5 rounded text-blue-600 dark:text-blue-400 font-semibold">Destacados</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Megaphone size={22} />
            </div>
          </DashboardCard>
        </div>

        {/* MODALS */}
        {selectedProduct && (
          <CampaignSelector
            productId={selectedProduct.id}
            productName={selectedProduct.title}
            currentBalance={walletData?.balance || 0}
            onClose={() => setSelectedProduct(null)}
            onActivated={() => {
              queryClient.invalidateQueries({ queryKey: ['marketplace-campaign-statuses'] });
              queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
              setSelectedProduct(null);
              addToast({ type: 'success', message: 'Campaña activada exitosamente' });
            }}
          />
        )}

        {/* 3. MAIN DASHBOARD CARD */}
        <DashboardCard className="p-6">
          {/* SEARCH & FILTERS BAR */}
          <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-4 pb-6 border-b border-base-300">
            <div className="flex-1 max-w-md space-y-1">
              <label className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider">BUSCAR PRODUCTO</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-base-content/50" size={16} />
                <input
                  type="text"
                  placeholder="Buscar por nombre, usuario o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-base-200 border border-base-300 rounded-xl focus:bg-base-100 focus:border-purple-600 outline-none transition-all text-base-content"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider block">ESTADO</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 text-xs bg-base-200 border border-base-300 rounded-xl focus:bg-base-100 focus:border-purple-600 outline-none text-base-content font-medium cursor-pointer"
              >
                <option value="">Todos los estados</option>
                <option value="PUBLISHED">Publicado</option>
                <option value="DRAFT">Borrador</option>
                <option value="PENDING_APPROVAL">Pendiente</option>
              </select>
            </div>
          </div>

          {/* CONTENT */}
          <div className="pt-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                <span className="text-xs font-semibold text-base-content/70">Cargando tus productos...</span>
              </div>
            ) : !filteredProducts || filteredProducts.length === 0 ? (
              /* NUTRINGEST STANDARD EMPTY STATE */
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center text-base-content/50 mb-3">
                  <XCircle size={28} />
                </div>
                <h3 className="text-base font-bold text-base-content">No existen registros.</h3>
                <p className="text-xs text-base-content/70 mt-1 max-w-sm">
                  No hay productos registrados que coincidan con la búsqueda.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse bg-base-100">
                  <thead>
                    <tr className="bg-base-200 border-b border-base-300 text-[11px] font-bold text-base-content/70 uppercase tracking-wider">
                      <th className="px-6 py-3.5">Producto</th>
                      <th className="px-6 py-3.5">Tipo</th>
                      <th className="px-6 py-3.5">Precio</th>
                      <th className="px-6 py-3.5">Estado</th>
                      <th className="px-6 py-3.5">Campaña</th>
                      <th className="px-6 py-3.5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-300 text-xs">
                    {filteredProducts.map((product: any) => {
                      const hasActiveCampaign = campaignStatuses?.[product.id] ?? false;
                      const badgeStyle = statusBadgeStyles[product.status] || 'bg-base-200 text-base-content/80 border-base-300';

                      return (
                        <tr key={product.id} className="hover:bg-base-200 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-base-content text-sm">{product.title}</div>
                            <div className="text-base-content/60 mt-0.5">
                              {product.category?.name || 'Sin categoría'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-base-200 text-base-content border border-base-300">
                              {product.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-base-content font-mono text-sm">
                            ${Number(product.price).toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeStyle}`}>
                              {statusLabels[product.status] || product.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {hasActiveCampaign ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <Megaphone size={12} /> Activa
                              </span>
                            ) : (
                              <button
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 transition-colors cursor-pointer"
                                onClick={() => handleOpenCampaignSelector({ id: product.id, title: product.title })}
                                disabled={product.status !== 'PUBLISHED'}
                              >
                                <Megaphone size={13} /> Promocionar
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link
                              href={`/dashboard/marketplace/${product.id}`}
                              className="inline-flex p-2 text-primary hover:bg-base-200 rounded-xl transition-colors"
                              title="Ver detalle"
                            >
                              <Eye size={16} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DashboardCard>
      </div>
    </MarketplaceGuard>
  );
}

