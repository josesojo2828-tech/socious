"use client";

import { useEffect, useState } from "react";
import { UserEndpoints } from '../../services/user.endpoints';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { Text } from '@/shared/components/atoms/Text';
import { useUniqueObject } from '@/shared/hooks/crud/useUniqueObject';
import { Subscription } from '@/types/backend/schema.types';
import { ScreenPlans } from '../subscription/ScreenPlans';
import { PresentationPlan } from '../subscription/PresentationPlan';
import { apiClient } from "@/shared/api/api.client";
import { useTranslation } from "@/context/i18n.context";
import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import { CreditCard, MessageSquare } from "lucide-react";
import { StatusBadge } from '../subscription/StatusBadge';
import AdminSubscriptionPage from './AdminSubscriptionPage';
import { useWorkspaceStore } from '@/shared/store/workspace/useWorkspaceStore';

function NutritionistSubscriptionPage() {
  const { t } = useTranslation();
  const { activeWorkspace } = useWorkspaceStore();
  
  // Update the useUniqueObject call to include workspace header
  const { entity, extra, Reload, loading } = useUniqueObject<Subscription>({
    path: UserEndpoints.actions.subscriptionByUser(),
    extraKey: 'next',
    headers: activeWorkspace?.id ? { 'x-workspace-id': activeWorkspace.id } : undefined,
  });

  const { openModal } = useModalStore();
  const [history, setHistory] = useState<Subscription[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const { workspaces } = useWorkspaceStore();
  const [workspaceSubscriptions, setWorkspaceSubscriptions] = useState<Record<string, Subscription>>({});

  useEffect(() => {
    const headers = activeWorkspace?.id ? { 'x-workspace-id': activeWorkspace.id } : {};
    apiClient.get(UserEndpoints.actions.subscriptions(), { headers })
      .then((res) => {
        if (res.data?.list) {
          setHistory(res.data.list);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingHistory(false));
  }, [loading, activeWorkspace]);

  useEffect(() => {
    const fetchWorkspaceSubscriptions = async () => {
      const orgWorkspaces = workspaces.filter(w => w.type === 'ORGANIZATION');
      const subs: Record<string, Subscription> = {};
      
      for (const workspace of orgWorkspaces) {
        try {
          const response = await apiClient.get(`/api/organizations/${workspace.id}/subscription`);
          if (response.data) {
            subs[workspace.id] = response.data;
          }
        } catch (error) {
          console.error(`Error fetching subscription for workspace ${workspace.id}:`, error);
        }
      }
      
      setWorkspaceSubscriptions(subs);
    };

    if (workspaces.length > 0) {
      fetchWorkspaceSubscriptions();
    }
  }, [workspaces]);

  console.log("=== [SubscriptionPage] Debug Logs ===");
  console.log("- loading:", loading);
  console.log("- active subscription (entity):", entity);
  console.log("- next subscription (extra):", extra);
  console.log("- loadingHistory:", loadingHistory);
  console.log("- history of subscriptions:", history);

  const latestSub = history[0];

  const renderStatusAlert = () => {
    if (!latestSub || entity) return null;

    const planName = latestSub.plan?.name || "Plan";
    const dateStr = latestSub.startDate ? new Date(latestSub.startDate).toLocaleDateString() : "";

    if ((latestSub.status as string) === "DECLINED") {
      return (
        <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in shadow-sm">
          <div className="flex gap-3">
            <span className="text-2xl mt-0.5">⚠️</span>
            <div>
              <h4 className="font-bold text-red-500 text-base">Suscripción Rechazada</h4>
              <p className="text-base-content/70 text-sm mt-1">
                Tu solicitud para el plan <strong className="text-base-content">{planName}</strong> enviada el {dateStr} fue declinada por el departamento de facturación.
              </p>
            </div>
          </div>
          <button
            onClick={() => openModal(<PresentationPlan entity={latestSub} Reload={Reload} />)}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
          >
            Ver Detalles
          </button>
        </div>
      );
    }

    if ((latestSub.status as string) === "PENDING") {
      return (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in shadow-sm">
          <div className="flex gap-3">
            <span className="text-2xl mt-0.5">⏳</span>
            <div>
              <h4 className="font-bold text-amber-500 text-base">Suscripción Pendiente</h4>
              <p className="text-base-content/70 text-sm mt-1">
                Tu pago para el plan <strong className="text-base-content">{planName}</strong> está siendo revisado por nuestro equipo. Te avisaremos en breve.
              </p>
            </div>
          </div>
          <button
            onClick={() => openModal(<PresentationPlan entity={latestSub} Reload={Reload} />)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
          >
            Ver Estado
          </button>
        </div>
      );
    }

    return null;
  };

  return loading ? <div>{t('common.status.loading')}</div> : (
    <div className="w-full max-w-6xl mx-auto p-6 md:p-8 space-y-10 animate-fade-in">
      <div className="flex flex-col gap-2">
        <Text as={'h2'} variant={'h1'}>{t('common.subscription.title')}</Text>
      </div>

      {renderStatusAlert()}

      {entity && entity.id && <PresentationPlan entity={entity} Reload={Reload} />}
      {extra && extra.id && <PresentationPlan entity={extra} Reload={Reload} />}

      {!entity && (!extra || !extra.id) && (
        <div className="bg-base-100 border border-base-300 rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-6 max-w-3xl mx-auto shadow-2xl relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-2xl flex items-center justify-center shadow-inner mb-2">
            <CreditCard size={32} />
          </div>

          <div className="space-y-2 max-w-lg font-sans">
            <h3 className="text-2xl font-bold text-base-content tracking-tight">No tienes un plan activo</h3>
            <p className="text-base-content/70 text-sm leading-relaxed">
              Para poder seguir gestionando pacientes, diseñar planes de alimentación y utilizar todas las funcionalidades avanzadas de la plataforma, necesitas adquirir o renovar tu suscripción.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-2 z-10 font-sans">
            <button
              onClick={() => {
                const el = document.getElementById("plans-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-900/40 hover:-translate-y-0.5 active:translate-y-0"
            >
              Ver Planes Disponibles
            </button>
            <a
              href="https://wa.me/584243153383?text=Hola,%20necesito%20soporte%20con%20mi%20suscripción%20en%20Nutringest"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-base-200 hover:bg-base-300 text-base-content border border-base-300 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
            >
              <MessageSquare size={16} />
              Soporte Técnico
            </a>
          </div>
        </div>
      )}

      {/* Historial de Facturación */}
      {history.length > 0 && (
        <div className="space-y-4 font-sans">
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-bold text-base-content">Historial de Facturación Personal</h3>
            <p className="text-base-content/70 text-xs">Registro detallado de tus suscripciones personales y solicitudes previas en la plataforma.</p>
          </div>

          <div className="overflow-x-auto bg-base-100 border border-base-300 rounded-3xl shadow-xl">
            <table className="table w-full text-base-content">
              <thead>
                <tr className="border-b border-base-300 text-base-content/70 uppercase text-[10px] tracking-widest bg-base-200/50">
                  <th className="py-4 px-6 text-left">Plan</th>
                  <th className="py-4 px-6 text-left">Fecha Inicio</th>
                  <th className="py-4 px-6 text-left">Fecha Fin</th>
                  <th className="py-4 px-6 text-left">Estado</th>
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-300">
                {history.map((sub) => (
                  <tr key={sub.id} className="hover:bg-base-200/50 transition-all">
                    <td className="py-4 px-6 font-semibold text-base-content">
                      {sub.plan?.name || "Plan"}
                    </td>
                    <td className="py-4 px-6 text-sm text-base-content/70">
                      {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : "-"}
                    </td>
                    <td className="py-4 px-6 text-sm text-base-content/70">
                      {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : "-"}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => openModal(<PresentationPlan entity={sub} Reload={Reload} />)}
                        className="px-3 py-1.5 bg-base-200 hover:bg-base-300 text-base-content rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95"
                      >
                        Ver Detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Suscripciones de Workspaces */}
      {Object.keys(workspaceSubscriptions).length > 0 && (
        <div className="space-y-4 font-sans">
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-bold text-base-content">Suscripciones de Espacios de Trabajo</h3>
            <p className="text-base-content/70 text-xs">Gestiona las suscripciones asociadas a tus espacios de trabajo organizacionales.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces
              .filter(w => w.type === 'ORGANIZATION')
              .map(workspace => {
                const sub = workspaceSubscriptions[workspace.id];
                return (
                  <div key={workspace.id} className="bg-base-100 border border-base-300 rounded-2xl p-5 hover:border-base-300 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: workspace.userColorHex || '#4F46E5' }}
                      >
                        {workspace.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-base-content text-sm">{workspace.name}</h4>
                        <p className="text-base-content/70 text-xs">{workspace.role?.replace('CLINIC_', '')}</p>
                      </div>
                    </div>

                    {sub ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-base-content/70 text-xs">Plan:</span>
                          <span className="text-base-content text-sm font-semibold">{sub.plan?.name || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-base-content/70 text-xs">Vigencia:</span>
                          <span className="text-base-content text-sm">
                            {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-base-content/70 text-xs">Estado:</span>
                          <StatusBadge status={sub.status} />
                        </div>
                        <button
                          onClick={() => openModal(<PresentationPlan entity={sub} Reload={Reload} />)}
                          className="w-full mt-3 px-4 py-2 bg-base-200 hover:bg-base-300 text-base-content rounded-xl text-xs font-bold transition-all"
                        >
                          Gestionar Suscripción
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-base-content/70 text-sm mb-3">Sin suscripción activa</p>
                        <button
                          onClick={() => {
                            const el = document.getElementById("plans-section");
                            if (el) el.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all"
                        >
                          Ver Planes
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Available Plans Section */}
      <div id="plans-section">
        <ScreenPlans Reload={Reload} />
      </div>
    </div>
  );
}

function ClinicSubscriptionSelection() {
  const { t } = useTranslation();
  const { activeWorkspace } = useWorkspaceStore();
  const { Reload } = useUniqueObject<Subscription>({
    path: UserEndpoints.actions.subscriptionByUser(),
    extraKey: 'next'
  });

  return (
    <div className="w-full max-w-6xl mx-auto p-6 md:p-8 space-y-8 animate-fade-in">
      <div className="flex flex-col gap-2">
        <Text as={'h2'} variant={'h1'}>
          {t('common.subscription.clinic_title') || 'Suscripción de la Clínica'}
        </Text>
        <p className="text-base-content/70 text-sm">
          Seleccioná el plan para <strong>{activeWorkspace?.name}</strong>. 
          Con la suscripción de clínica, todos los nutricionistas invitados tendrán acceso al software.
        </p>
      </div>

      {/* Current Subscription Info */}
      {activeWorkspace?.subscriptionStatus && activeWorkspace.subscriptionStatus !== 'NONE' && (
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h4 className="font-bold text-emerald-800 dark:text-emerald-300">Suscripción Activa</h4>
            <p className="text-emerald-600 dark:text-emerald-400 text-sm">
              Tu clínica tiene una suscripción activa. Los nutricionistas invitados tienen acceso.
            </p>
          </div>
        </div>
      )}

      {/* Plans Section */}
      <div id="plans-section">
        <ScreenPlans Reload={Reload} />
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  const { user } = useAuthStore();
  const { activeWorkspace } = useWorkspaceStore();
  const isAdmin = activeWorkspace?.role === 'CLINIC_ADMIN' || 
                  user?.permits?.name === 'ADMIN' || 
                  user?.permits?.name === 'SUPERADMIN';

  // For organization workspaces, show clinic subscription selection
  if (activeWorkspace?.type === 'ORGANIZATION') {
    return <ClinicSubscriptionSelection />;
  }

  if (isAdmin) {
    return <AdminSubscriptionPage />;
  }

  return <NutritionistSubscriptionPage />;
}