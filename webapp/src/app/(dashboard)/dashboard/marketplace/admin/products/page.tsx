'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/api.client';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { DashboardCard } from '@/features/nutringest/components/DashboardCard';
import { ArrowLeft, Check, X, Eye, Package, Loader2, XCircle } from 'lucide-react';

const statusLabels: Record<string, string> = {
  DRAFT: 'Borrador',
  PENDING_APPROVAL: 'Pendiente',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'PENDING_APPROVAL':
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Pendiente</span>;
    case 'PUBLISHED':
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Publicado</span>;
    case 'APPROVED':
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Aprobado</span>;
    case 'REJECTED':
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Rechazado</span>;
    default:
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">{statusLabels[status] || status}</span>;
  }
};

export default function AdminProductsPage() {
  const [statusFilter, setStatusFilter] = useState('PENDING_APPROVAL');
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace-admin-products', statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const { data } = await apiClient.get(`/api/marketplace/admin/products${params}`);
      return data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/api/marketplace/admin/products/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-admin-products'] });
      addToast({ type: 'success', message: 'Producto aprobado exitosamente' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Error al aprobar el producto' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/api/marketplace/admin/products/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-admin-products'] });
      addToast({ type: 'success', message: 'Producto rechazado' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Error al rechazar el producto' });
    },
  });

  const tabs = [
    { value: 'PENDING_APPROVAL', label: 'Pendientes' },
    { value: 'PUBLISHED', label: 'Publicados' },
    { value: 'REJECTED', label: 'Rechazados' },
    { value: 'ALL', label: 'Todos' },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500 font-sans">
      {/* 1. HEADER PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight uppercase">
            GESTIONAR PRODUCTOS
          </h1>
          <p className="text-gray-500 text-xs font-medium mt-0.5">
            Modera y autoriza los recursos digitales subidos por los profesionales
          </p>
        </div>
        <Link
          href="/dashboard/marketplace/admin"
          className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all w-fit"
        >
          <ArrowLeft size={16} /> Volver al Admin
        </Link>
      </div>

      {/* 2. MAIN DASHBOARD CARD */}
      <DashboardCard className="p-6">
        {/* TABS FILTER */}
        <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === tab.value
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-gray-100/80 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* LIST */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-2" />
            <span className="text-xs font-semibold text-gray-500">Cargando productos...</span>
          </div>
        ) : !data?.products || data.products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100/80 flex items-center justify-center text-gray-400 mb-3">
              <XCircle size={28} />
            </div>
            <h3 className="text-base font-bold text-gray-800">No existen registros.</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">
              No hay productos que coincidan con el filtro seleccionado.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.products.map((product: any) => (
              <div
                key={product.id}
                className="p-5 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="flex items-start gap-3 flex-1">
                  {product.coverUrl ? (
                    <img
                      src={product.coverUrl}
                      alt={product.title}
                      className="w-14 h-14 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
                      <Package size={22} />
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-bold text-gray-800 text-sm">{product.title}</h3>
                      {getStatusBadge(product.status)}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 max-w-2xl leading-relaxed">
                      {(product.description || '').replace(/<[^>]*>?/gm, '').trim() || 'Sin descripción'}
                    </p>
                    <div className="flex items-center gap-4 text-[11px] text-gray-500 font-medium pt-1 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        {product.seller?.avatar || product.seller?.avatarUrl || product.seller?.image ? (
                          <img
                            src={product.seller?.avatar || product.seller?.avatarUrl || product.seller?.image}
                            alt="Seller"
                            className="w-4 h-4 rounded-full object-cover border border-purple-200"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-purple-600 text-white font-bold text-[9px] flex items-center justify-center">
                            {product.seller?.firstName?.[0] || 'V'}
                          </div>
                        )}
                        <span>Vendedor: <strong className="text-gray-700">{product.seller?.firstName} {product.seller?.lastName}</strong></span>
                      </div>
                      <span>Precio: <strong className="text-emerald-700 font-bold font-mono">${product.price}</strong></span>
                      <span>Tipo: <strong className="text-purple-700 font-semibold">{product.type}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  {product.status === 'PENDING_APPROVAL' && (
                    <>
                      <button
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                        onClick={() => approveMutation.mutate(product.id)}
                        disabled={approveMutation.isPending}
                      >
                        <Check size={14} /> Aprobar
                      </button>
                      <button
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                        onClick={() => rejectMutation.mutate(product.id)}
                        disabled={rejectMutation.isPending}
                      >
                        <X size={14} /> Rechazar
                      </button>
                    </>
                  )}
                  <Link
                    href={`/dashboard/marketplace/${product.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <Eye size={14} /> Ver
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardCard>
    </div>
  );
}

