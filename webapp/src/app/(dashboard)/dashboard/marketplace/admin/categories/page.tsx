'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/api.client';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { DashboardCard } from '@/features/nutringest/components/DashboardCard';
import { FolderTree, Plus, Trash2, Tag, ArrowLeft, Loader2, X } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  _count?: {
    products: number;
  };
}

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');

  // Fetch categories
  const { data: categories, isLoading } = useQuery({
    queryKey: ['marketplace-admin-categories'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/marketplace/categories');
      return data;
    },
  });

  // Create category mutation
  const createMutation = useMutation({
    mutationFn: (newCategory: { name: string; description?: string; icon?: string }) =>
      apiClient.post('/api/marketplace/admin/categories', newCategory),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-admin-categories'] });
      addToast({ type: 'success', message: 'Categoría creada exitosamente' });
      setIsModalOpen(false);
      resetForm();
    },
    onError: () => {
      addToast({ type: 'error', message: 'Error al crear la categoría' });
    },
  });

  // Delete category mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/marketplace/admin/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-admin-categories'] });
      addToast({ type: 'success', message: 'Categoría eliminada' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Error al eliminar la categoría' });
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setIcon('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name, description, icon });
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500 font-sans">
      {/* 1. HEADER PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight uppercase">
            CATEGORÍAS DEL MARKETPLACE
          </h1>
          <p className="text-gray-500 text-xs font-medium mt-0.5">
            Organiza y clasifica los productos digitales y servicios de la plataforma
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/marketplace/admin"
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
          >
            <ArrowLeft size={16} /> Volver al Admin
          </Link>
          <button
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={16} /> Nueva Categoría
          </button>
        </div>
      </div>

      {/* 2. MAIN TABLE CARD */}
      <DashboardCard className="p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-2" />
            <span className="text-xs font-semibold text-gray-500">Cargando categorías...</span>
          </div>
        ) : !categories || categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100/80 flex items-center justify-center text-gray-400 mb-3">
              <FolderTree size={28} />
            </div>
            <h3 className="text-base font-bold text-gray-800">No existen registros.</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mb-4">
              Aún no has registrado ninguna categoría para agrupar productos.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <Plus size={16} /> Crear primera categoría
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="pb-3 px-3">Categoría</th>
                  <th className="pb-3 px-3">Slug</th>
                  <th className="pb-3 px-3">Descripción</th>
                  <th className="pb-3 px-3 text-center">Productos</th>
                  <th className="pb-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-700">
                {categories.map((cat: Category) => (
                  <tr key={cat.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5 font-bold text-gray-800">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 flex-shrink-0">
                          <Tag size={15} />
                        </div>
                        <span>{cat.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-gray-500 text-[11px]">{cat.slug}</td>
                    <td className="py-3.5 px-3 text-gray-500 max-w-xs truncate">
                      {cat.description || <span className="italic text-gray-300">Sin descripción</span>}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100">
                        {cat._count?.products || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                        onClick={() => {
                          if (confirm(`¿Estás seguro de eliminar la categoría "${cat.name}"?`)) {
                            deleteMutation.mutate(cat.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        title="Eliminar categoría"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardCard>

      {/* CREATE CATEGORY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-800 text-base">Crear Nueva Categoría</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Nombre de la Categoría *</label>
                <input
                  type="text"
                  placeholder="ej. Nutrición Deportiva"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-hidden focus:border-purple-600 text-xs"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Descripción (opcional)</label>
                <textarea
                  placeholder="Breve explicación de la categoría..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-hidden focus:border-purple-600 text-xs h-20 resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Guardando...' : 'Crear Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

