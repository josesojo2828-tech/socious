"use client";

import { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  Clock,
  UserCheck,
  FileText,
  Building2,
  UserPlus,
  RefreshCw,
  ArrowRight,
  Plus,
  ShieldCheck,
  TrendingUp,
  Wallet,
  CreditCard,
} from 'lucide-react';
import Link from 'next/link';
import { useWorkspaceRole } from '@/shared/hooks/useWorkspaceRole';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import { organizationService } from '../services/organization.service';
import type { ClinicDetails, ClinicStats, PersonalClinicStats, OrganizationAppointment } from '../services/organization.service';
import { SeatExpansionModal } from '../components/SeatExpansionModal';
import { AgendaHistoryChart } from '@/features/user/components/dashboard/AgendaHistoryChart';
import { PremiumHubShowcase } from '@/features/user/components/dashboard/PremiumHubShowcase';

export function ClinicDashboardPage() {
  const { user } = useAuthStore();
  const { isGlobalAdmin, isOrganization, orgId: workspaceOrgId, activeWorkspace, targetOrgWorkspace } = useWorkspaceRole();
  const [clinic, setClinic] = useState<ClinicDetails | null>(null);
  const [stats, setStats] = useState<ClinicStats | null>(null);
  const [personalStats, setPersonalStats] = useState<PersonalClinicStats | null>(null);
  const [appointments, setAppointments] = useState<OrganizationAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSeatModalOpen, setIsSeatModalOpen] = useState(false);

  const orgId = workspaceOrgId || null;

  // If not on organization workspace, don't fetch clinic data
  if (!isOrganization || !orgId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <Building2 className="w-12 h-12 mb-3 text-slate-300" />
        <p className="text-sm font-bold text-slate-500">Seleccioná un workspace de clínica para ver este panel.</p>
      </div>
    );
  }

  // Permite conmutar la vista si es Admin, o fija en modo Nutricionista si no es admin
  const [viewScope, setViewScope] = useState<'GLOBAL' | 'PERSONAL'>(
    isGlobalAdmin ? 'GLOBAL' : 'PERSONAL'
  );

  useEffect(() => {
    setViewScope(isGlobalAdmin ? 'GLOBAL' : 'PERSONAL');
  }, [isGlobalAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [details, clinicStats, personalClinicStats, appts] = await Promise.all([
        organizationService.getClinicDetails(orgId),
        organizationService.getClinicStats(orgId),
        organizationService.getPersonalClinicStats(orgId),
        organizationService.getClinicAppointments(orgId),
      ]);
      setClinic(details);
      setStats(clinicStats);
      setPersonalStats(personalClinicStats);
      setAppointments(appts);
    } catch (err) {
      console.error('Error al cargar dashboard de clínica:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [orgId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-indigo-600" />
        <p className="text-xs font-bold text-slate-600">Cargando panel operativo de la clínica...</p>
      </div>
    );
  }

  const todayAppointments = appointments.filter((a) => {
    return true;
  });

  const activeSeats = clinic?.members?.length || 0;
  const maxSeats = clinic?.maxSeats || 5;

  const myTodayAppointments = appointments.filter(
    (a) =>
      a.nutritionistName?.toLowerCase().includes(user?.firstName?.toLowerCase() || '')
  );
  const myTodayCount = personalStats?.myTodayAppointments ?? myTodayAppointments.length;
  const myPatientsCount = personalStats?.myPatients ?? 0;
  const myMenusCount = personalStats?.myMenus ?? 0;
  const myAttendance = personalStats?.myAttendance ?? 100;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 font-sans">
      {/* TOP HERO BANNER (Dark Enterprise Aesthetic - Sin Card Outline) */}
      <div className="relative overflow-hidden rounded-xl bg-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        {/* Glow decorativo de fondo */}
        <div className="absolute -top-16 -right-16 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {clinic?.name || targetOrgWorkspace?.name || 'Centro Nutricional Santa María'}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Operación Activa
                </span>
                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  {viewScope === 'GLOBAL' ? 'VISTA ADMINISTRADOR' : 'VISTA NUTRICIONISTA'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 font-medium max-w-2xl">
                {viewScope === 'GLOBAL'
                  ? 'Centro Clínico Acreditado. Monitoreo en tiempo real de agenda, cuerpo médico y métricas del servicio.'
                  : `Panel personal en ${clinic?.name || 'la clínica'}. Monitoreo de tus pacientes y agenda de consulta en este centro.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isGlobalAdmin && (
              <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 shadow-inner">
                <button
                  onClick={() => setViewScope('GLOBAL')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewScope === 'GLOBAL'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Ver métricas de toda la clínica"
                >
                  🏥 Resumen Clínica
                </button>
                <button
                  onClick={() => setViewScope('PERSONAL')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewScope === 'PERSONAL'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Ver solo mis métricas personales en esta clínica"
                >
                  👤 Mi Resumen
                </button>
              </div>
            )}

            <button
              onClick={fetchData}
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all border border-slate-700/80 shadow-xs cursor-pointer"
              title="Refrescar datos"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {isGlobalAdmin && (
              <>
                <Link
                  href={`/dashboard/organization/${orgId}/billing`}
                  className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer border border-emerald-400/30"
                >
                  <CreditCard className="w-4 h-4" />
                  Ir al Billing
                </Link>
                <Link
                  href="/dashboard/organization"
                  className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  Gestionar Equipo
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Live Glance Stats Row inside Hero */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-slate-300 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              Verificación:{' '}
              <strong className="text-white">
                {clinic?.verificationStatus === 'VERIFIED'
                  ? 'Acreditada 🛡️'
                  : clinic?.verificationStatus === 'PENDING'
                  ? 'En Revisión ⏳'
                  : 'Sin Verificar ⚠️'}
              </strong>
            </span>
          </div>

          {viewScope === 'GLOBAL' ? (
            <>
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-indigo-400" />
                <div className="flex items-center gap-1.5">
                  <span>
                    Capacidad: <strong className="text-white">{activeSeats} / {maxSeats} Nutris</strong>
                  </span>
                  {isGlobalAdmin && (
                    <button
                      onClick={() => setIsSeatModalOpen(true)}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                      title="Ampliar cupos de nutricionistas ($12/mes)"
                    >
                      Expandir
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Turnos Hoy (Clínica): <strong className="text-white">{todayAppointments.length} Citas</strong></span>
              </div>
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-blue-400" />
                <span>Historias Activas: <strong className="text-white">{stats?.totalPatients ?? 0} Pacientes</strong></span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Mis Citas Hoy: <strong className="text-white">{myTodayCount} Citas</strong></span>
              </div>
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-indigo-400" />
                <span>Mis Pacientes (Clínica): <strong className="text-white">{myPatientsCount} Pacientes</strong></span>
              </div>
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Mis Menús Generados: <strong className="text-white">{myMenusCount} Dietas</strong></span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Premium Hub - Campus, Community, Foods, Exchange Foods */}
      <PremiumHubShowcase />

      {/* 4 Contadores Operativos Clave (Crisp rounded-xl) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {viewScope === 'GLOBAL' ? (
          <>
            {/* Card 1: Nutricionistas */}
            <div className="bg-base-100 p-5 rounded-xl border border-base-300 shadow-sm hover:border-indigo-500/30 transition-all text-base-content">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-base-content/60 uppercase tracking-wider">Equipo Nutris</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-base-content">{stats?.activeMembers || activeSeats}</span>
                <span className="text-xs text-base-content/60 font-semibold">/ {maxSeats} cupos</span>
              </div>
              <div className="mt-3 w-full bg-base-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(((stats?.activeMembers || activeSeats) / maxSeats) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Card 2: Citas Hoy */}
            <div className="bg-base-100 p-5 rounded-xl border border-base-300 shadow-sm hover:border-emerald-500/30 transition-all text-base-content">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-base-content/60 uppercase tracking-wider">Citas Programadas (Hoy)</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-base-content">
                {stats?.todayAppointments || todayAppointments.length}
              </div>
              <p className="text-[11px] text-emerald-500 mt-2 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Turnos agendados para la jornada
              </p>
            </div>

            {/* Card 3: Pacientes en Clínica */}
            <div className="bg-base-100 p-5 rounded-xl border border-base-300 shadow-sm hover:border-blue-500/30 transition-all text-base-content">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-base-content/60 uppercase tracking-wider">Pacientes de Clínica</span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-base-content">
                {stats?.totalPatients || 0}
              </div>
              <p className="text-[11px] text-base-content/60 mt-2 font-medium">Historias clínicas vinculadas al centro</p>
            </div>

            {/* Card 4: Planes & Menús */}
            <div className="bg-base-100 p-5 rounded-xl border border-base-300 shadow-sm hover:border-indigo-500/30 transition-all text-base-content">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-base-content/60 uppercase tracking-wider">Planes & Menús Generados</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-base-content">
                {stats?.totalPlans || 0}
              </div>
              <p className="text-[11px] text-base-content/60 mt-2 font-medium">Dietas y menús creados por el equipo</p>
            </div>
          </>
        ) : (
          <>
            {/* Card 1: Mis Citas Hoy */}
            <div className="bg-base-100 p-5 rounded-xl border border-base-300 shadow-sm hover:border-emerald-500/30 transition-all text-base-content">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-base-content/60 uppercase tracking-wider">Mis Citas de Hoy</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-base-content">
                {myTodayCount}
              </div>
              <p className="text-[11px] text-emerald-500 mt-2 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Pacientes agendados en tu turno
              </p>
            </div>

            {/* Card 2: Mis Pacientes en Clínica */}
            <div className="bg-base-100 p-5 rounded-xl border border-base-300 shadow-sm hover:border-indigo-500/30 transition-all text-base-content">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-base-content/60 uppercase tracking-wider">Mis Pacientes Asignados</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-base-content">
                {myPatientsCount}
              </div>
              <p className="text-[11px] text-base-content/60 mt-2 font-medium">Historias vinculadas a tu consulta en la clínica</p>
            </div>

            {/* Card 3: Mis Menús Generados */}
            <div className="bg-base-100 p-5 rounded-xl border border-base-300 shadow-sm hover:border-indigo-500/30 transition-all text-base-content">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-base-content/60 uppercase tracking-wider">Mis Menús Generados</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-base-content">
                {myMenusCount}
              </div>
              <p className="text-[11px] text-base-content/60 mt-2 font-medium">Dietas y minutas elaboradas por ti</p>
            </div>

            {/* Card 4: Mi Cumplimiento */}
            <div className="bg-base-100 p-5 rounded-xl border border-base-300 shadow-sm hover:border-amber-500/30 transition-all text-base-content">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-base-content/60 uppercase tracking-wider">Mi Asistencia Acumulada</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-base-content">
                {myAttendance}%
              </div>
              <p className="text-[11px] text-emerald-500 mt-2 font-semibold">Alto nivel de puntualidad de agenda</p>
            </div>
          </>
        )}
      </div>

      {/* Gráfico de Histórico de Agenda con selector Mes/Año */}
      <AgendaHistoryChart orgId={orgId} />

      {/* Main Grid: Citas de Hoy (Izquierda) + Miembros / Distribución (Derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabla de Citas de Hoy (2 columnas en LG) */}
        <div className="lg:col-span-2 bg-base-100 rounded-xl border border-base-300 p-5 shadow-sm space-y-5 text-base-content">
          <div className="flex items-center justify-between pb-3.5 border-b border-base-200">
            <div>
              <h2 className="text-base font-bold text-base-content flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Citas Programadas para Hoy
              </h2>
              <p className="text-xs text-base-content/70 mt-0.5">
                Atenciones agendadas para la jornada actual organizadas por nutricionista.
              </p>
            </div>
            <Link
              href="/dashboard/diets"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              Ver Agenda Completa <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {todayAppointments.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-base-300 rounded-lg text-base-content/60">
              <Clock className="w-8 h-8 text-base-content/40 mx-auto mb-2" />
              <p className="text-xs font-bold text-base-content">No hay citas registradas para hoy</p>
              <p className="text-[11px] text-base-content/60 mt-0.5">Los turnos agendados en el calendario de la clínica aparecerán aquí.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
              {todayAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-base-200 bg-base-200/50 hover:bg-base-100 hover:border-primary/20 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    {/* Time Pill */}
                    <div className="px-2.5 py-1 rounded-md bg-neutral text-neutral-content font-mono font-bold text-xs shadow-2xs flex items-center gap-1.5 shrink-0">
                      <Clock className="w-3 h-3 text-primary" />
                      {apt.time}
                    </div>

                    {/* Patient info */}
                    <div>
                      <h4 className="text-xs font-extrabold text-base-content group-hover:text-primary transition-colors">
                        {apt.patientName}
                      </h4>
                      <p className="text-[11px] text-base-content/60 font-medium">Consulta Nutricional</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Nutritionist Pill */}
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-base-100 border border-base-300 shadow-2xs">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: apt.nutritionistColor || '#4F46E5' }}
                      />
                      <span className="text-[11px] font-bold text-base-content/80">
                        {apt.nutritionistName}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                        apt.status === 'CONFIRMED' || apt.status === 'CONFIRMADA'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : apt.status === 'COMPLETED' || apt.status === 'COMPLETADA'
                          ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}
                    >
                      {apt.status === 'SCHEDULED' ? 'Agendada' : apt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel Lateral: Equipo de Nutricionistas */}
        <div className="bg-base-100 rounded-xl border border-base-300 p-5 shadow-sm space-y-5 text-base-content">
          <div className="flex items-center justify-between pb-3.5 border-b border-base-200">
            <h2 className="text-sm font-bold text-base-content flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Equipo Nutricional
            </h2>
            <span className="text-xs font-bold text-base-content/60">
              {activeSeats} de {maxSeats}
            </span>
          </div>

          <div className="space-y-2.5">
            {clinic?.members?.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 rounded-lg bg-base-200/70 border border-base-300"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg font-bold flex items-center justify-center text-white text-xs shadow-2xs shrink-0"
                    style={{ backgroundColor: m.colorHex }}
                  >
                    {m.user.firstName?.[0] || 'N'}
                  </div>
                  <div className="truncate max-w-[140px]">
                    <h3 className="text-xs font-bold text-base-content truncate">
                      {m.user.firstName} {m.user.lastName}
                    </h3>
                    <p className="text-[10px] text-base-content/60 truncate">{m.user.email}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-primary/10 text-primary">
                    {m.role === 'CLINIC_ADMIN' ? 'Admin' : 'Nutri'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {isGlobalAdmin && (
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Link
                href={`/dashboard/organization/${orgId}/billing`}
                className="w-full py-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <Wallet className="w-4 h-4 text-primary" /> Facturación & Billetera
              </Link>
              <Link
                href="/dashboard/organization"
                className="w-full py-2.5 rounded-lg border border-base-300 text-base-content hover:bg-base-200 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 text-base-content/60" /> Configurar Colores & Roles
              </Link>
            </div>
          )}
        </div>
      </div>

      {orgId && (
        <SeatExpansionModal
          orgId={orgId}
          currentMaxSeats={maxSeats}
          currentActiveSeats={activeSeats}
          isOpen={isSeatModalOpen}
          onClose={() => setIsSeatModalOpen(false)}
          onSuccess={(newSeats) => {
            if (clinic) setClinic({ ...clinic, maxSeats: newSeats });
            fetchData();
          }}
        />
      )}
    </div>
  );
}
