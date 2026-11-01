import React, { useEffect, useState } from 'react';
import { apiClient } from '@/shared/api/api.client';
import {
  X,
  User,
  Mail,
  Calendar,
  Users,
  FileText,
  Shield,
  Trash2,
  RefreshCw,
  Palette,
} from 'lucide-react';

interface Member {
  id: string;
  userId: string;
  role: string;
  colorHex: string;
  /** El endpoint puede omitir el estado del miembro. */
  status?: string;
  createdAt?: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
    createdAt?: string;
  };
}

interface MemberSummary {
  member: Member;
  stats: {
    patientCount: number;
    appointmentCount: number;
    menuCount: number;
  };
}

interface NutritionistDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  member: Member | null;
  onUpdateMember: () => void;
}

const AVAILABLE_COLORS = [
  '#4F46E5', // Indigo
  '#059669', // Emerald
  '#D97706', // Amber
  '#4338ca', // Violet
  '#DB2777', // Pink
  '#2563EB', // Blue
  '#DC2626', // Red
  '#0891B2', // Cyan
];

export const NutritionistDetailModal: React.FC<NutritionistDetailModalProps> = ({
  isOpen,
  onClose,
  orgId,
  member,
  onUpdateMember,
}) => {
  const [summary, setSummary] = useState<MemberSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    if (!orgId || !member) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/api/organizations/${orgId}/members/${member.id}/summary`);
      setSummary(res.data);
    } catch (err: unknown) {
      console.error('Error al cargar ficha del colaborador:', err);
      setError('No se pudo cargar la información operativa del profesional.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && member) {
      fetchSummary();
    } else {
      setSummary(null);
    }
  }, [isOpen, member?.id]);

  if (!isOpen || !member) return null;

  const handleColorChange = async (colorHex: string) => {
    setIsUpdating(true);
    try {
      await apiClient.patch(`/api/organizations/${orgId}/members/${member.id}/color`, { colorHex });
      onUpdateMember();
      fetchSummary();
    } catch (e) {
      console.error('Error al actualizar color:', e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRoleToggle = async () => {
    const newRole = member.role === 'CLINIC_ADMIN' ? 'NUTRITIONIST' : 'CLINIC_ADMIN';
    setIsUpdating(true);
    try {
      await apiClient.patch(`/api/organizations/${orgId}/members/${member.id}/role`, { role: newRole });
      onUpdateMember();
      fetchSummary();
    } catch (e) {
      console.error('Error al actualizar rol:', e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!confirm(`¿Estás seguro de dar de baja a ${member.user.firstName} ${member.user.lastName} de esta clínica?`)) {
      return;
    }
    setIsUpdating(true);
    try {
      await apiClient.delete(`/api/organizations/${orgId}/members/${member.id}`);
      onUpdateMember();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      alert(e?.response?.data?.message || 'Error al remover al profesional');
    } finally {
      setIsUpdating(false);
    }
  };

  const memberData = summary?.member || member;
  const stats = summary?.stats || { patientCount: 0, appointmentCount: 0, menuCount: 0 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-base-100 text-base-content rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-base-300 relative space-y-6 max-h-[85vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-base-content/50 hover:text-base-content rounded-full hover:bg-base-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Profile Card Header */}
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl font-black text-2xl text-white flex items-center justify-center shadow-lg shrink-0"
            style={{ backgroundColor: memberData.colorHex || '#4F46E5' }}
          >
            {memberData.user.firstName?.[0] || 'N'}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-base-content">
                {memberData.user.firstName} {memberData.user.lastName}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  memberData.role === 'CLINIC_ADMIN'
                    ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50'
                    : 'bg-base-200 text-base-content/70 border border-base-300'
                }`}
              >
                {memberData.role === 'CLINIC_ADMIN' ? 'Administrador' : 'Colaborador'}
              </span>
            </div>
            <p className="text-xs text-base-content/70 flex items-center gap-1.5 mt-1">
              <Mail className="w-3.5 h-3.5 text-base-content/50" /> {memberData.user.email}
            </p>
          </div>
        </div>

        {/* 3 KPI Metric Cards */}
        {isLoading ? (
          <div className="py-8 flex items-center justify-center text-primary">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-base-200 p-4 rounded-2xl border border-base-300 text-center">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-2xl font-black text-base-content">{stats.patientCount}</span>
              <p className="text-[10px] font-bold text-base-content/50 uppercase tracking-wider mt-0.5">Pacientes</p>
            </div>

            <div className="bg-base-200 p-4 rounded-2xl border border-base-300 text-center">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-2xl font-black text-base-content">{stats.appointmentCount}</span>
              <p className="text-[10px] font-bold text-base-content/50 uppercase tracking-wider mt-0.5">Citas</p>
            </div>

            <div className="bg-base-200 p-4 rounded-2xl border border-base-300 text-center">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-2">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-2xl font-black text-base-content">{stats.menuCount}</span>
              <p className="text-[10px] font-bold text-base-content/50 uppercase tracking-wider mt-0.5">Menús</p>
            </div>
          </div>
        )}

        {/* Color de Agenda Selector */}
        <div className="space-y-2 pt-2 border-t border-base-300">
          <label className="text-xs font-bold text-base-content flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Color de Agenda en Calendario
          </label>
          <div className="flex items-center gap-2">
            {AVAILABLE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => handleColorChange(c)}
                disabled={isUpdating}
                className={`w-7 h-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center ${
                  memberData.colorHex === c ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-base-300 flex items-center justify-between gap-3">
          <button
            onClick={handleRoleToggle}
            disabled={isUpdating}
            className="px-4 py-2.5 rounded-2xl border border-base-300 hover:bg-base-200 text-base-content text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            <Shield className="w-4 h-4 text-base-content/50" />
            {memberData.role === 'CLINIC_ADMIN' ? 'Cambiar a Nutri Staff' : 'Ascender a Admin'}
          </button>

          <button
            onClick={handleRemoveMember}
            disabled={isUpdating}
            className="px-4 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Dar de Baja
          </button>
        </div>
      </div>
    </div>
  );
};
