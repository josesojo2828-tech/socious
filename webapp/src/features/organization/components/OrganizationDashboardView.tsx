"use client";

import { ClinicManagementPage } from "@/features/organization/pages/ClinicManagementPage";
import { useWorkspaceRole } from "@/shared/hooks/useWorkspaceRole";
import { Users, Eye } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { organizationService } from "@/features/organization/services/organization.service";
import { NutritionistDetailModal } from "@/features/organization/components/NutritionistDetailModal";

interface Member {
  id: string;
  userId: string;
  role: string;
  colorHex: string;
  status?: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
}

export function TeamMemberView() {
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
      setMembers(data.members || []);
    } catch (e) {
      console.error("Error al cargar equipo:", e);
    } finally {
      setIsLoading(false);
    }
  }, [targetOrgWorkspace?.id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  if (!targetOrgWorkspace) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Equipo de {targetOrgWorkspace.name}</h1>
        </div>
        <p className="text-indigo-100 text-sm">
          Miembros y colaboradores de la empresa
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>No hay otros miembros registrados en el equipo</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="bg-white p-5 rounded-xl border border-slate-200/70 shadow-xs hover:border-indigo-200 transition-all dark:bg-slate-900 dark:border-slate-800"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: member.colorHex || "#4F46E5" }}
                  >
                    {member.user.firstName?.[0]}
                    {member.user.lastName?.[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {member.user.firstName} {member.user.lastName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {member.user.email}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    member.status === "ACTIVE"
                      ? "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {member.status === "ACTIVE" ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-slate-500 capitalize dark:text-slate-400">
                  {member.role?.toLowerCase().replace("_", " ")}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMember(member);
                    setIsDetailModalOpen(true);
                  }}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer dark:text-indigo-400"
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

export function OrganizationDashboardView() {
  const { activeWorkspace, targetOrgWorkspace } = useWorkspaceRole();

  const canHaveTeam =
    targetOrgWorkspace != null &&
    (targetOrgWorkspace.maxSeats == null || targetOrgWorkspace.maxSeats > 1);

  if (!canHaveTeam) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <Users className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
        <h3 className="mt-3 text-base font-semibold text-slate-800 dark:text-slate-200">
          Espacio Personal
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          La gestión de colaboradores y equipo está habilitada para organizaciones y empresas con suscripción activa.
        </p>
      </div>
    );
  }

  const isAdmin =
    activeWorkspace?.role === "OWNER" ||
    activeWorkspace?.role === "ADMIN" ||
    activeWorkspace?.role === "CLINIC_ADMIN" ||
    activeWorkspace?.role === "SUPERADMIN";

  if (!isAdmin) {
    return <TeamMemberView />;
  }

  return <ClinicManagementPage />;
}
