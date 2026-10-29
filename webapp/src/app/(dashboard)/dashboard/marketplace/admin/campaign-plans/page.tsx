'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, Palette, Video, Megaphone, Smartphone, ArrowLeft, Plus, RefreshCw, Trash2, Edit, Loader2, Sparkles } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  campaignPlanService,
  CampaignPlan,
} from '@/features/marketplace/services/marketplace.service';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { DashboardCard } from '@/features/nutringest/components/DashboardCard';

export default function CampaignPlansPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<CampaignPlan | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    duration: 30,
    designs: 0,
    videos: 0,
    posts: 0,
    socialMedia: false,
    sortOrder: 0,
  });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['marketplace-admin-campaign-plans'],
    queryFn: () => campaignPlanService.findAllAdmin(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<CampaignPlan>) => campaignPlanService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-admin-campaign-plans'] });
      addToast({ type: 'success', message: 'Plan creado exitosamente' });
      setShowModal(false);
    },
    onError: () => {
      addToast({ type: 'error', message: 'Error al crear el plan' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CampaignPlan> }) =>
      campaignPlanService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-admin-campaign-plans'] });
      addToast({ type: 'success', message: 'Plan actualizado exitosamente' });
      setShowModal(false);
    },
    onError: () => {
      addToast({ type: 'error', message: 'Error al actualizar el plan' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => campaignPlanService.toggleActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-admin-campaign-plans'] });
      addToast({ type: 'success', message: 'Estado del plan actualizado' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Error al cambiar estado del plan' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => campaignPlanService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-admin-campaign-plans'] });
      addToast({ type: 'success', message: 'Plan eliminado' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Error al eliminar el plan' });
    },
  });

  const seedMutation = useMutation({
    mutationFn: () => campaignPlanService.seed(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-admin-campaign-plans'] });
      addToast({ type: 'success', message: 'Planes de ejemplo cargados' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Error al cargar planes de ejemplo' });
    },
  });

  const handleCreate = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      description: '',
      price: 0,
      duration: 30,
      designs: 0,
      videos: 0,
      posts: 0,
      socialMedia: false,
      sortOrder: 0,
    });
    setShowModal(true);
  };

  const handleEdit = (plan: CampaignPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price: plan.price,
      duration: plan.duration,
      designs: plan.designs,
      videos: plan.videos,
      posts: plan.posts,
      socialMedia: plan.socialMedia,
      sortOrder: plan.sortOrder,
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este plan?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500 font-sans">
      {/* 1. HEADER PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight uppercase flex items-center gap-2">
            PLANES DE CAMPAÑA
          </h1>
          <p className="text-gray-500 text-xs font-medium mt-0.5">
            Gestiona los planes publicitarios y paquetes de promoción para el marketplace
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => seedMutation.mutate()}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            disabled={seedMutation.isPending}
          >
            {seedMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            Planes de Ejemplo
          </button>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus size={16} /> Nuevo Plan
          </button>
          <Link
            href="/dashboard/marketplace/admin"
            className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
          >
            <ArrowLeft size={16} /> Volver
          </Link>
        </div>
      </div>

      {/* 2. MAIN CONTENT */}
      {isLoading ? (
        <DashboardCard className="p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-2" />
          <span className="text-xs font-semibold text-gray-500">Cargando planes de campaña...</span>
        </DashboardCard>
      ) : plans.length === 0 ? (
        <DashboardCard className="p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
            <Sparkles size={28} />
          </div>
          <h3 className="text-base font-bold text-gray-800">No hay planes configurados</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mb-4">
            Puedes cargar una plantilla de planes por defecto o crear uno personalizado.
          </p>
          <button
            onClick={() => seedMutation.mutate()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            disabled={seedMutation.isPending}
          >
            {seedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw size={14} />}
            Cargar planes de ejemplo
          </button>
        </DashboardCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <DashboardCard
              key={plan.id}
              className={`p-6 flex flex-col justify-between relative transition-all ${
                !plan.isActive ? 'opacity-65 bg-gray-50/50' : 'hover:border-purple-200'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-3 gap-2">
                  <div>
                    <h3 className="font-bold text-gray-800 text-base">{plan.name}</h3>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 ${
                      plan.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {plan.isActive ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </div>
                  <div className="bg-purple-50 border border-purple-100 text-purple-700 px-3 py-1.5 rounded-xl font-black text-lg font-mono">
                    ${plan.price}
                  </div>
                </div>

                {plan.description && (
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed line-clamp-2">
                    {plan.description}
                  </p>
                )}

                <div className="border-t border-gray-100 pt-4 mb-6 space-y-2 text-xs text-gray-600 font-medium">
                  <div className="flex items-center gap-2.5">
                    <Calendar size={14} className="text-purple-500" />
                    <span>Duración: <strong className="text-gray-800">{plan.duration} días</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Palette size={14} className="text-purple-500" />
                    <span>Diseños incluidos: <strong className="text-gray-800">{plan.designs}</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Video size={14} className="text-purple-500" />
                    <span>Videos promocionales: <strong className="text-gray-800">{plan.videos}</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Megaphone size={14} className="text-purple-500" />
                    <span>Publicaciones destacadas: <strong className="text-gray-800">{plan.posts}</strong></span>
                  </div>
                  {plan.socialMedia && (
                    <div className="flex items-center gap-2.5 text-purple-700 font-semibold pt-1">
                      <Smartphone size={14} />
                      <span>Promoción en Redes Sociales</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  onClick={() => toggleMutation.mutate(plan.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    plan.isActive
                      ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                  disabled={toggleMutation.isPending}
                >
                  {plan.isActive ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => handleEdit(plan)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Edit size={13} /> Editar
                </button>
                <button
                  onClick={() => handleDelete(plan.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer flex items-center gap-1"
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 size={13} /> Eliminar
                </button>
              </div>
            </DashboardCard>
          ))}
        </div>
      )}

      {/* MODAL CREAR / EDITAR */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">
              {editingPlan ? 'Editar Plan de Campaña' : 'Nuevo Plan de Campaña'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Nombre del Plan *
                </label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-hidden focus:border-purple-600 text-xs font-medium"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ej. Plan Destacado Gold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Descripción
                </label>
                <textarea
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-hidden focus:border-purple-600 text-xs font-medium h-20"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción detallada de lo que incluye este plan..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Precio (USD) *
                  </label>
                  <input
                    type="number"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-hidden focus:border-purple-600 text-xs font-medium font-mono"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Duración (Días) *
                  </label>
                  <input
                    type="number"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-hidden focus:border-purple-600 text-xs font-medium"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Diseños
                  </label>
                  <input
                    type="number"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-hidden focus:border-purple-600 text-xs font-medium"
                    value={formData.designs}
                    onChange={(e) => setFormData({ ...formData, designs: Number(e.target.value) })}
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Videos
                  </label>
                  <input
                    type="number"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-hidden focus:border-purple-600 text-xs font-medium"
                    value={formData.videos}
                    onChange={(e) => setFormData({ ...formData, videos: Number(e.target.value) })}
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Posts
                  </label>
                  <input
                    type="number"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-hidden focus:border-purple-600 text-xs font-medium"
                    value={formData.posts}
                    onChange={(e) => setFormData({ ...formData, posts: Number(e.target.value) })}
                    min="0"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="socialMedia"
                  className="w-4 h-4 rounded-md border-gray-300 text-purple-600 focus:ring-purple-500"
                  checked={formData.socialMedia}
                  onChange={(e) => setFormData({ ...formData, socialMedia: e.target.checked })}
                />
                <label htmlFor="socialMedia" className="text-xs font-bold text-gray-700 cursor-pointer">
                  Publicidad en Redes Sociales
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingPlan ? (
                    'Guardar Cambios'
                  ) : (
                    'Crear Plan'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

