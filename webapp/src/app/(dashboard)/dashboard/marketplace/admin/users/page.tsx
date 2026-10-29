'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/api.client';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { DashboardCard } from '@/features/nutringest/components/DashboardCard';
import { UserCheck, UserX, Shield, Mail, ArrowLeft, Loader2, XCircle } from 'lucide-react';

interface UserWithSellerStatus {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  image?: string;
  isSeller: boolean;
}

export default function AdminSellerUsersPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  // Fetch all users with seller status
  const { data: users, isLoading } = useQuery({
    queryKey: ['marketplace-admin-sellers'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/marketplace/admin/sellers');
      return data;
    },
  });

  // Grant permission mutation
  const grantMutation = useMutation({
    mutationFn: (userId: string) =>
      apiClient.post(`/api/marketplace/admin/sellers/grant`, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-admin-sellers'] });
      addToast({ type: 'success', message: 'Permiso de vendedor otorgado' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Error al otorgar permiso' });
    },
  });

  // Revoke permission mutation
  const revokeMutation = useMutation({
    mutationFn: (userId: string) =>
      apiClient.delete(`/api/marketplace/admin/sellers/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-admin-sellers'] });
      addToast({ type: 'success', message: 'Permiso de vendedor removido' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Error al remover permiso' });
    },
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500 font-sans">
      {/* 1. HEADER PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight uppercase">
            PERMISOS DE VENDEDOR
          </h1>
          <p className="text-gray-500 text-xs font-medium mt-0.5">
            Otorga o revoca permisos de vendedor para publicar productos y campañas
          </p>
        </div>
        <Link
          href="/dashboard/marketplace/admin"
          className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all w-fit"
        >
          <ArrowLeft size={16} /> Volver al Admin
        </Link>
      </div>

      {/* 2. INFO BANNER */}
      <div className="bg-purple-50/80 border border-purple-100 p-4 rounded-xl flex items-center gap-3 text-purple-900 text-xs font-medium">
        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4" />
        </div>
        <span>
          Los usuarios con permiso de vendedor habilitado pueden crear productos digitales, plantillas y lanzar campañas en el marketplace.
        </span>
      </div>

      {/* 3. MAIN TABLE CARD */}
      <DashboardCard className="p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-2" />
            <span className="text-xs font-semibold text-gray-500">Cargando lista de usuarios...</span>
          </div>
        ) : !users || users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100/80 flex items-center justify-center text-gray-400 mb-3">
              <XCircle size={28} />
            </div>
            <h3 className="text-base font-bold text-gray-800">No existen registros.</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">
              No se encontraron usuarios registrados en la plataforma.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="pb-3 px-3">Usuario</th>
                  <th className="pb-3 px-3">Correo Electrónico</th>
                  <th className="pb-3 px-3">Estado</th>
                  <th className="pb-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-700">
                {users.map((item: any) => {
                  const u = item.user || item;
                  const firstName = u.firstName || '';
                  const lastName = u.lastName || '';
                  const fullName = `${firstName} ${lastName}`.trim() || 'Usuario';
                  const email = u.email || 'Sin correo';
                  const avatarUrl = u.avatar || u.avatarUrl || u.image;
                  const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || 'U';
                  const isSeller = typeof item.isSeller === 'boolean' ? item.isSeller : Boolean(item.permission);
                  const userId = u.id || item.userId || item.id;

                  return (
                    <tr key={userId} className="hover:bg-gray-50/60 transition-colors">
                      {/* USER COLUMN WITH AVATAR */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={fullName}
                              className="w-10 h-10 rounded-full object-cover border border-purple-200 shadow-xs flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                              {initials}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-gray-800 text-xs">
                              {fullName}
                            </div>
                            <span className="text-[11px] text-gray-400 font-mono">ID: {userId.substring(0, 8)}...</span>
                          </div>
                        </div>
                      </td>

                      {/* EMAIL COLUMN */}
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1.5 text-gray-600 font-normal">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          {email}
                        </span>
                      </td>

                      {/* STATUS BADGE */}
                      <td className="py-3.5 px-3">
                        {isSeller ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <UserCheck size={12} /> Vendedor
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                            Usuario
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3.5 px-3 text-right">
                        {isSeller ? (
                          <button
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50"
                            onClick={() => revokeMutation.mutate(userId)}
                            disabled={revokeMutation.isPending}
                          >
                            <UserX size={14} /> Quitar Permiso
                          </button>
                        ) : (
                          <button
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
                            onClick={() => grantMutation.mutate(userId)}
                            disabled={grantMutation.isPending}
                          >
                            <UserCheck size={14} /> Hacer Vendedor
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DashboardCard>
    </div>
  );
}

