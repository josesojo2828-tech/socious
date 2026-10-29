"use client";

import { ClinicManagementPage } from "@/features/nutringest/clinic/pages/ClinicManagementPage";
import { useWorkspaceRole } from "@/shared/hooks/useWorkspaceRole";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { Users, Eye } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { organizationService } from "@/features/nutringest/clinic/services/organization.service";
import { NutritionistDetailModal } from "@/features/nutringest/clinic/components/NutritionistDetailModal";

interface Member {
  id: string;
  userId: string;
  role: string;
  colorHex: string;
  status: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
}

function NutritionistTeamView() {
  const { targetOrgWorkspace } = useWorkspaceRole();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!targetOrgWorkspace) return;
    setIsLoading(true);
    try {
      const data = await organizationService.getClinicDetails(targetOrgWorkspace.id);
      setMembers((data as any)?.members || []);
    } catch (e) {
      console.error('Error al cargar equipo:', e);
    } finally {
      setIsLoading(false);
    }
  }, [targetOrgWorkspace?.id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  if (!targetOrgWorkspace) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-sm max-w-lg mx-auto my-12">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Equipo de la Clínica</h2>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Seleccioná una clínica en el desplegable superior de workspaces para ver el equipo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Equipo de la Clínica</h1>
        </div>
        <p className="text-indigo-100 text-sm">
          Nutricionistas que forman parte de {targetOrgWorkspace.name}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>No hay miembros en el equipo</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="bg-white p-5 rounded-xl border border-slate-200/70 shadow-xs hover:border-indigo-200 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: member.colorHex || '#4F46E5' }}
                  >
                    {member.user.firstName?.[0]}{member.user.lastName?.[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {member.user.firstName} {member.user.lastName}
                    </h3>
                    <p className="text-xs text-slate-500">{member.user.email}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  member.status === 'ACTIVE' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {member.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-slate-500 capitalize">
                  {member.role?.toLowerCase().replace('_', ' ')}
                </span>
                <button
                  onClick={() => {
                    setSelectedMember(member);
                    setIsDetailModalOpen(true);
                  }}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver Perfil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <NutritionistDetailModal
        orgId={targetOrgWorkspace.id}
        member={selectedMember}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedMember(null);
        }}
        onUpdateMember={fetchMembers}
      />
    </div>
  );
}

export default function OrganizationDashboardPage() {
  const { activeWorkspace } = useWorkspaceRole();
  
  const isAdmin = activeWorkspace?.role === 'CLINIC_ADMIN' || 
                  activeWorkspace?.role === 'ADMIN' || 
                  activeWorkspace?.role === 'SUPERADMIN';
  
  if (!isAdmin) {
    return <NutritionistTeamView />;
  }
  
  return <ClinicManagementPage />;
}
