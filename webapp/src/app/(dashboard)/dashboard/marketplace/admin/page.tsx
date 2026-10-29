'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/api.client';
import { DashboardCard } from '@/features/nutringest/components/DashboardCard';
import { Package, Tag, Megaphone, CreditCard, Layers, BarChart3, ArrowRight, ShieldCheck } from 'lucide-react';

export default function AdminMarketplacePage() {
  const { data: stats } = useQuery({
    queryKey: ['marketplace-admin-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/marketplace/admin/products?limit=1');
      return data;
    },
  });

  const { data: campaigns } = useQuery({
    queryKey: ['marketplace-admin-campaigns'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/marketplace/admin/campaigns');
      return data;
    },
  });

  const { data: pendingPayments } = useQuery({
    queryKey: ['marketplace-admin-pending-payments'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/marketplace/admin/wallet-payments?status=PENDING&limit=1');
      return data;
    },
  });

  const totalProducts = stats?.pagination?.total || 0;
  const activeCampaigns = campaigns?.filter((c: any) => c.status === 'ACTIVE')?.length || 0;
  const pendingCount = pendingPayments?.pagination?.total || 0;
  const totalCampaigns = campaigns?.length || 0;

  const adminModules = [
    {
      title: 'Productos',
      description: 'Aprobar, rechazar y auditar catálogo de productos publicables',
      href: '/dashboard/marketplace/admin/products',
      icon: Package,
      badge: `${totalProducts} Productos`,
      color: 'text-purple-600 bg-purple-50 border-purple-100',
    },
    {
      title: 'Planes de Campaña',
      description: 'Configurar precios, duraciones e impactos de promociones ($25 / $49 / $99)',
      href: '/dashboard/marketplace/admin/campaign-plans',
      icon: Layers,
      badge: 'Planes Promocionales',
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
    {
      title: 'Pagos de Billetera',
      description: 'Revisar y verificar comprobantes de pago de recarga reportados',
      href: '/dashboard/marketplace/admin/payments',
      icon: CreditCard,
      badge: pendingCount > 0 ? `${pendingCount} Pendientes` : 'Sin Pendientes',
      color: pendingCount > 0 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-gray-600 bg-gray-50 border-gray-200',
    },
    {
      title: 'Categorías',
      description: 'Administrar categorías, tipos y taxonomía del catálogo global',
      href: '/dashboard/marketplace/admin/categories',
      icon: Tag,
      badge: 'Taxonomía',
      color: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      title: 'Todas las Campañas',
      description: 'Supervisar rendimiento e interacciones de campañas publicitarias activas',
      href: '/dashboard/marketplace/admin/campaigns',
      icon: Megaphone,
      badge: `${activeCampaigns} Activas`,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Permisos de Vendedor',
      description: 'Otorgar, suspender o auditar licencias de venta para usuarios',
      href: '/dashboard/marketplace/admin/users',
      icon: BarChart3,
      badge: 'Licencias Vendedor',
      color: 'text-rose-600 bg-rose-50 border-rose-100',
    },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500 font-sans">
      {/* 1. HEADER PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight uppercase flex items-center gap-2">
            <ShieldCheck className="text-purple-600" size={26} />
            ADMINISTRACIÓN DEL MARKETPLACE
          </h1>
          <p className="text-gray-500 text-xs font-medium mt-0.5">
            Panel de control operativo central para moderación, cobros y permisos
          </p>
        </div>
        <Link
          href="/dashboard/marketplace"
          className="inline-flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer w-fit"
        >
          Catálogo Público <ArrowRight size={16} />
        </Link>
      </div>

      {/* 2. STATS CARDS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard className="p-5 flex items-start justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">PRODUCTOS</p>
            <h3 className="text-2xl font-black text-gray-800">{totalProducts}</h3>
            <div className="flex items-center mt-2 text-xs font-medium text-gray-500">
              <span className="bg-purple-50 px-2 py-0.5 rounded text-purple-700 font-semibold">En plataforma</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-purple-500/10 text-purple-600">
            <Package size={22} />
          </div>
        </DashboardCard>

        <DashboardCard className="p-5 flex items-start justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">CAMPAÑAS ACTIVAS</p>
            <h3 className="text-2xl font-black text-gray-800">{activeCampaigns}</h3>
            <div className="flex items-center mt-2 text-xs font-medium text-gray-500">
              <span className="bg-emerald-50 px-2 py-0.5 rounded text-emerald-700 font-semibold">En rotación</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600">
            <Megaphone size={22} />
          </div>
        </DashboardCard>

        <DashboardCard className="p-5 flex items-start justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">PAGOS PENDIENTES</p>
            <h3 className="text-2xl font-black text-gray-800">{pendingCount}</h3>
            <div className="flex items-center mt-2 text-xs font-medium text-gray-500">
              <span className="bg-amber-50 px-2 py-0.5 rounded text-amber-700 font-semibold">Por verificar</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-600">
            <CreditCard size={22} />
          </div>
        </DashboardCard>

        <DashboardCard className="p-5 flex items-start justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">TOTAL CAMPAÑAS</p>
            <h3 className="text-2xl font-black text-gray-800">{totalCampaigns}</h3>
            <div className="flex items-center mt-2 text-xs font-medium text-gray-500">
              <span className="bg-blue-50 px-2 py-0.5 rounded text-blue-700 font-semibold">Histórico</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-600">
            <Layers size={22} />
          </div>
        </DashboardCard>
      </div>

      {/* 3. MAIN DASHBOARD CARD MODULES GRID */}
      <DashboardCard className="p-6">
        <div className="mb-6 pb-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">MÓDULOS DE GESTIÓN OPERATIVA</h2>
          <p className="text-xs text-gray-500 mt-0.5">Accede a las herramientas de control administrativo del ecosistema</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {adminModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.title}
                href={module.href}
                className="group p-5 border border-gray-100/90 rounded-2xl bg-gray-50/50 hover:bg-white hover:border-purple-200 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl border ${module.color}`}>
                      <Icon size={20} />
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-700 shadow-2xs">
                      {module.badge}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-800 group-hover:text-purple-600 transition-colors">
                    {module.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                    {module.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100/80 flex items-center justify-between text-xs font-bold text-purple-600">
                  <span>Acceder al módulo</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </DashboardCard>
    </div>
  );
}

