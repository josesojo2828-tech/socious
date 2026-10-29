import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '@/shared/store/workspace/useWorkspaceStore';
import { useWorkspaceRole } from '@/shared/hooks/useWorkspaceRole';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import { ClinicAgendaCalendar } from '../components/ClinicAgendaCalendar';
import { NutritionistDetailModal } from '../components/NutritionistDetailModal';
import { Eye, Trash2, UserPlus, Calendar as CalendarIcon, Users, Sparkles, Plus, Wallet } from 'lucide-react';
import Link from 'next/link';
import { organizationService } from '../services/organization.service';
import { SeatExpansionModal } from '../components/SeatExpansionModal';
import { apiClient } from '@/shared/api/api.client';

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

interface ClinicDetails {
  id: string;
  name: string;
  taxId?: string;
  logoUrl?: string;
  maxSeats: number;
  members: Member[];
}

export const ClinicManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const { fetchWorkspaces } = useWorkspaceStore();
  const { activeWorkspace, targetOrgWorkspace, isGlobalAdmin } = useWorkspaceRole();
  const [clinic, setClinic] = useState<ClinicDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('NUTRITIONIST');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSeatModalOpen, setIsSeatModalOpen] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'calendar' | 'members'>('calendar');

  // Detail Modal state
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchWorkspaces(user);
  }, [user]);

  const fetchClinicDetails = async () => {
    if (!targetOrgWorkspace) return;
    setIsLoading(true);
    try {
      const data = await organizationService.getClinicDetails(targetOrgWorkspace.id);
      setClinic(data as any);
    } catch (e) {
      console.error('Error al cargar la clínica:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClinicDetails();
  }, [targetOrgWorkspace?.id]);

  const handleColorChange = async (memberId: string, newColor: string) => {
    if (!clinic) return;
    try {
      await apiClient.patch(`/api/organizations/${clinic.id}/members/${memberId}/color`, {
        colorHex: newColor,
      });

      setClinic((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          members: prev.members.map((m) => (m.id === memberId ? { ...m, colorHex: newColor } : m)),
        };
      });
    } catch (e) {
      console.error('Error al cambiar el color del nutricionista:', e);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic) return;
    setInviteError(null);
    try {
      await apiClient.post(`/api/organizations/${clinic.id}/members/invite`, {
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteEmail('');
      setIsInviteModalOpen(false);
      fetchClinicDetails();
    } catch (err: any) {
      setInviteError(err.response?.data?.message || 'Error al invitar al profesional');
    }
  };

  const handleRemoveMember = async (member: Member) => {
    if (!clinic) return;
    if (!confirm(`¿Estás seguro de dar de baja a ${member.user.firstName} ${member.user.lastName} de esta clínica?`)) {
      return;
    }
    try {
      await apiClient.delete(`/api/organizations/${clinic.id}/members/${member.id}`);
      fetchClinicDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar al profesional');
    }
  };

  const handleOpenDetail = (member: Member) => {
    setSelectedMember(member);
    setIsDetailModalOpen(true);
  };

  if (!targetOrgWorkspace) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-sm max-w-lg mx-auto my-12">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Gestión de Clínica B2B</h2>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Actualmente estás en el contexto <strong className="text-slate-700 font-semibold">"Consulta Personal"</strong>. Seleccioná una clínica en el desplegable superior de workspaces para gestionar los nutricionistas y la agenda compartida.
        </p>
      </div>
    );
  }

  const activeSeats = clinic?.members?.length || 0;
  let savedSeats = 5;
  if (targetOrgWorkspace?.id && typeof window !== 'undefined') {
    const s = localStorage.getItem(`clinic_max_seats_${targetOrgWorkspace.id}`);
    if (s && !isNaN(Number(s))) savedSeats = Number(s);
  }
  const maxSeats = Math.max(clinic?.maxSeats || 5, savedSeats);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 font-sans">
      {/* Header Banner (Limpio & Blanco) */}
      <div className="relative overflow-hidden rounded-3xl bg-white p-6 sm:p-8 text-slate-900 shadow-sm border border-slate-200/80">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-3xl font-extrabold border border-indigo-100">
              🏥
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{clinic?.name || targetOrgWorkspace.name}</h1>
                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-200">
                  Plan Enterprise {maxSeats} Seats
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Gestión de nutricionistas, asignación de colores de agenda y ficha operativa.
              </p>
            </div>
          </div>

          {/* Seat Capacity Gauge */}
          <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl min-w-[240px] space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-500">Cupos de Nutris:</span>
              <span className="text-slate-900 font-extrabold">{activeSeats} / {maxSeats}</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min((activeSeats / maxSeats) * 100, 100)}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={() => setIsSeatModalOpen(true)}
                className="py-1.5 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" /> Ampliar (+Cupos)
              </button>
              <Link
                href={`/dashboard/organization/${targetOrgWorkspace?.id}/billing`}
                className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition-all flex items-center justify-center gap-1 text-center"
              >
                <Wallet className="w-3 h-3 text-indigo-600" /> Billetera
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'calendar'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          Agenda Coloreada Multi-Nutri
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'members'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          Miembros & Colores ({activeSeats})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'calendar' ? (
        <ClinicAgendaCalendar />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Nutricionistas y Personal de la Clínica
              </h3>
              <p className="text-xs text-slate-500">
                Visualizá el perfil operativo, asigná colores para el calendario y gestioná el equipo.
              </p>
            </div>

            <button
              onClick={() => setIsInviteModalOpen(true)}
              disabled={activeSeats >= maxSeats}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Invitar Nutricionista ({activeSeats}/{maxSeats})
            </button>
          </div>

          {/* Members Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xl shadow-slate-200/50">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Profesional</th>
                    <th className="px-6 py-4">Rol en Clínica</th>
                    <th className="px-6 py-4">Color de Agenda</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {clinic?.members.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-2xl font-bold flex items-center justify-center text-white text-sm shadow-md"
                            style={{ backgroundColor: m.colorHex }}
                          >
                            {m.user.firstName?.[0] || 'N'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {m.user.firstName} {m.user.lastName}
                            </div>
                            <div className="text-[11px] text-slate-400">{m.user.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          m.role === 'CLINIC_ADMIN'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {m.role === 'CLINIC_ADMIN' ? 'Administrador' : 'Nutricionista'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={m.colorHex}
                            onChange={(e) => handleColorChange(m.id, e.target.value)}
                            className="w-8 h-8 rounded-xl border-0 cursor-pointer shadow-sm p-0 bg-transparent"
                          />
                          <span className="font-mono text-xs font-bold text-slate-600 uppercase">
                            {m.colorHex}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700">
                          {m.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenDetail(m)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver Ficha
                          </button>

                          <button
                            onClick={() => handleRemoveMember(m)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Dar de baja"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-2xl bg-base-100 text-base-content rounded-3xl border border-base-300 shadow-2xl p-6 sm:p-8 space-y-4 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-extrabold text-base-content">
              Invitar Nutricionista a la Clínica
            </h3>
            <p className="text-xs text-base-content/70 leading-relaxed">
              El profesional recibirá acceso a los pacientes y agenda de la clínica manteniendo su cuenta personal independiente.
            </p>

            {inviteError && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs font-semibold">
                {inviteError}
              </div>
            )}

            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-base-content mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  placeholder="nutricionista@ejemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-base-300 bg-base-200 focus:bg-base-100 text-xs text-base-content focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-base-content mb-1">
                  Rol en la Clínica
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-base-300 bg-base-200 focus:bg-base-100 text-xs text-base-content focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                >
                  <option value="NUTRITIONIST">Nutricionista Profesional</option>
                  <option value="CLINIC_ADMIN">Administrador de Clínica</option>
                  <option value="RECEPTIONIST">Recepción / Secretaria</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-base-content/70 hover:bg-base-200 cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-content text-xs font-bold shadow-lg cursor-pointer transition-all"
                >
                  Enviar Invitación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Nutritionist Detail Sheet Modal */}
      {clinic && (
        <NutritionistDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          orgId={clinic.id}
          member={selectedMember}
          onUpdateMember={() => {
            fetchClinicDetails();
          }}
        />
      )}

      {/* Seat Expansion Modal */}
      {targetOrgWorkspace && (
        <SeatExpansionModal
          orgId={targetOrgWorkspace.id}
          currentMaxSeats={maxSeats}
          currentActiveSeats={activeSeats}
          isOpen={isSeatModalOpen}
          onClose={() => setIsSeatModalOpen(false)}
          onSuccess={(newSeats: number) => {
            if (clinic) setClinic({ ...clinic, maxSeats: newSeats });
            fetchClinicDetails();
            fetchWorkspaces(user);
          }}
        />
      )}
    </div>
  );
};
