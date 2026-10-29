"use client";

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/shared/api/api.client';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import { isSuperadmin, hasPermit } from '@/shared/authz';
import { CampusRecursosGrid } from '@/features/nutringest/campus/components/CampusRecursosGrid';
import { 
  Loader2, 
  Check, 
  X, 
  FileText, 
  ExternalLink, 
  Calendar, 
  GraduationCap, 
  Copy, 
  CheckCheck, 
  CheckCircle2,
  Clock,
  Ban,
  Building
} from 'lucide-react';

interface CampusRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  university: string;
  graduationDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  documentFile?: {
    id: string;
    name: string;
    url: string;
  };
}

export default function CampusDashboardPage() {
  const { user } = useAuthStore();
  const canList = hasPermit(user, 'CAMPUS_LIST') || isSuperadmin(user);
  const canApprove = hasPermit(user, 'CAMPUS_APPROVE') || isSuperadmin(user);
  const canReject = hasPermit(user, 'CAMPUS_REJECT') || isSuperadmin(user);

  const { addToast } = useToastStore();
  const [requests, setRequests] = useState<CampusRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Modal state for coupon code display
  const [generatedCoupon, setGeneratedCoupon] = useState<{ code: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchRequests = async () => {
    if (!canList) return;
    setLoading(true);
    try {
      const response = await apiClient.get<CampusRequest[]>('/api/campus/requests');
      setRequests(response.data);
    } catch (err: any) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Error al cargar',
        message: 'No se pudieron obtener las solicitudes del Campus.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canList) {
      fetchRequests();
    }
  }, [canList]);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const response = await apiClient.post<{ coupon: { code: string; email: string } }>(`/api/campus/requests/${id}/approve`);
      addToast({
        type: 'success',
        title: 'Solicitud aprobada',
        message: 'Se ha generado el cupón de acceso exclusivo.',
      });
      // Show code in modal
      setGeneratedCoupon(response.data.coupon);
      // Update local state
      setRequests(prev => prev.map(req => req.id === id ? { ...req, status: 'APPROVED' } : req));
    } catch (err: any) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Error de aprobación',
        message: err.response?.data?.message || 'No se pudo aprobar la solicitud.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await apiClient.post(`/api/campus/requests/${id}/reject`);
      addToast({
        type: 'success',
        title: 'Solicitud rechazada',
        message: 'La solicitud ha sido rechazada.',
      });
      // Update local state
      setRequests(prev => prev.map(req => req.id === id ? { ...req, status: 'REJECTED' } : req));
    } catch (err: any) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Error de rechazo',
        message: err.response?.data?.message || 'No se pudo rechazar la solicitud.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const copyToClipboard = () => {
    if (generatedCoupon) {
      navigator.clipboard.writeText(generatedCoupon.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast({
        type: 'success',
        title: 'Copiado',
        message: 'Código copiado al portapapeles.',
      });
    }
  };

  const filteredRequests = requests.filter(req => {
    if (filter === 'ALL') return true;
    return req.status === filter;
  });

  const getInitials = (first: string, last: string) => {
    return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();
  };

  // Stats computation for Admin Dashboard
  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'PENDING').length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    rejected: requests.filter(r => r.status === 'REJECTED').length,
  };

  const [activeTab, setActiveTab] = useState<'CATALOG' | 'ADMIN_REQUESTS'>('CATALOG');

  if (!canList) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-in fade-in duration-300">
        <CampusRecursosGrid theme="light" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 sm:p-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Campus Nutringest</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Plataforma educativa y centro de recursos didácticos para la comunidad Nutringest.
          </p>
        </div>

        {/* Admin Navigation Switcher */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 shrink-0">
          <button
            onClick={() => setActiveTab('CATALOG')}
            aria-label="Catálogo de Recursos"
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all border-none outline-none cursor-pointer ${
              activeTab === 'CATALOG'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <GraduationCap size={16} className="text-emerald-600" />
            <span>Catálogo de Recursos</span>
          </button>

          <button
            onClick={() => setActiveTab('ADMIN_REQUESTS')}
            aria-label="Gestión de Solicitudes"
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all border-none outline-none cursor-pointer ${
              activeTab === 'ADMIN_REQUESTS'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building size={16} className="text-purple-600" />
            <span>Solicitudes Alumnos ({stats.pending})</span>
          </button>
        </div>
      </div>

      {/* Render selected View */}
      {activeTab === 'CATALOG' ? (
        <CampusRecursosGrid theme="light" />
      ) : (
        <>


      {/* KPI Stats Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Card */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
          <div className="p-4 bg-purple-50 text-[#9333ea] rounded-2xl border border-purple-100/50">
            <GraduationCap size={24} className="stroke-[2.5]" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Solicitudes</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{stats.total}</h3>
          </div>
        </div>

        {/* Pending Card */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
          <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100/50">
            <Clock size={24} className="stroke-[2.5]" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Pendientes</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{stats.pending}</h3>
          </div>
        </div>

        {/* Approved Card */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100/50">
            <CheckCircle2 size={24} className="stroke-[2.5]" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Aprobadas</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{stats.approved}</h3>
          </div>
        </div>

        {/* Rejected Card */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
          <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100/50">
            <Ban size={24} className="stroke-[2.5]" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Rechazadas</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{stats.rejected}</h3>
          </div>
        </div>
      </div>

      {/* Filter and Content Card */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full sm:w-fit border border-slate-200/20">
            {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-xl transition-all border-none outline-none cursor-pointer ${
                  filter === status
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {status === 'PENDING' ? 'Pendientes' : status === 'APPROVED' ? 'Aprobadas' : status === 'REJECTED' ? 'Rechazadas' : 'Todas'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
            <Loader2 className="animate-spin text-[#9333ea]" size={36} />
            <p className="text-slate-500 font-medium text-sm">Cargando solicitudes...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm">
            <GraduationCap className="mx-auto text-slate-300 mb-4 animate-bounce" size={48} />
            <h3 className="text-lg font-bold text-slate-700">No hay solicitudes</h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto mt-1">No se encontraron solicitudes con el filtro seleccionado.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-5">Estudiante</th>
                    <th className="px-6 py-5">Universidad</th>
                    <th className="px-6 py-5">Graduación</th>
                    <th className="px-6 py-5">Documento</th>
                    <th className="px-6 py-5">Estado</th>
                    <th className="px-6 py-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Student Profile Card Style */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-500/20 text-[#9333ea] border border-purple-500/10 flex items-center justify-center font-extrabold text-sm uppercase tracking-wide shrink-0">
                            {getInitials(req.firstName, req.lastName)}
                          </div>
                          <div>
                            <div className="text-slate-900 font-bold leading-tight">{req.firstName} {req.lastName}</div>
                            <div className="text-slate-400 text-xs font-semibold mt-0.5">{req.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* University Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600 font-semibold">
                          <Building size={16} className="text-slate-400 shrink-0" />
                          <span>{req.university}</span>
                        </div>
                      </td>

                      {/* Graduation Date */}
                      <td className="px-6 py-4 text-slate-500">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Calendar size={14} className="text-slate-400" />
                          {new Date(req.graduationDate).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Document Download Link */}
                      <td className="px-6 py-4">
                        {req.documentFile ? (
                          <a
                            href={req.documentFile.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl transition-all font-bold text-xs"
                          >
                            <FileText size={14} className="text-slate-500" />
                            <span className="max-w-[100px] truncate">{req.documentFile.name}</span>
                            <ExternalLink size={10} className="text-slate-400" />
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs">Sin archivo</span>
                        )}
                      </td>

                      {/* Application Status Badge */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full ${
                          req.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : req.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            req.status === 'PENDING' ? 'bg-amber-500' : req.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`} />
                          {req.status === 'PENDING' ? 'Pendiente' : req.status === 'APPROVED' ? 'Aprobada' : 'Rechazada'}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="px-6 py-4 text-right">
                        {req.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            {canApprove && (
                              <button
                                onClick={() => handleApprove(req.id)}
                                disabled={processingId === req.id}
                                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white p-2.5 rounded-xl border-none cursor-pointer transition-all shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/25 active:scale-95"
                                title="Aprobar Solicitud"
                              >
                                <Check size={16} className="stroke-[3]" />
                              </button>
                            )}
                            {canReject && (
                              <button
                                onClick={() => handleReject(req.id)}
                                disabled={processingId === req.id}
                                className="bg-rose-50 hover:bg-rose-600 disabled:opacity-50 text-white p-2.5 rounded-xl border-none cursor-pointer transition-all shadow-md shadow-rose-500/10 hover:shadow-rose-500/25 active:scale-95"
                                title="Rechazar Solicitud"
                              >
                                <X size={16} className="stroke-[3]" />
                              </button>
                            )}
                            {!canApprove && !canReject && (
                              <span className="text-xs text-slate-400 font-bold bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">Sin permisos</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-bold bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">Procesada</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Coupon Modal */}
      {generatedCoupon && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] max-w-md w-full p-8 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 border border-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} />
            </div>

            <h3 className="text-2xl font-black text-slate-900 mb-2">¡Solicitud Aprobada!</h3>
            <p className="text-slate-500 text-sm font-medium mb-6">
              Se ha generado un código de acceso exclusivo para <span className="text-slate-800 font-bold">{generatedCoupon.email}</span>.
            </p>

            {/* Code presentation */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between mb-6 font-mono text-lg font-black text-slate-800 tracking-wider">
              <span>{generatedCoupon.code}</span>
              <button
                onClick={copyToClipboard}
                className="p-2 hover:bg-slate-200/50 rounded-xl text-slate-500 hover:text-slate-700 transition-colors border-none outline-none cursor-pointer"
              >
                {copied ? <CheckCheck size={20} className="text-emerald-500" /> : <Copy size={20} />}
              </button>
            </div>

            <button
              onClick={() => setGeneratedCoupon(null)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold transition-colors cursor-pointer border-none outline-none"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

