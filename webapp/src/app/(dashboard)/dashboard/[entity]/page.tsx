"use client";

import {
  Users,
  CreditCard,
  Layers,
  Settings,
  Plus,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Shield,
  Wallet,
  ArrowLeftRight,
  Pencil,
  Trash,
  FileText,
  GraduationCap,
  Check,
  X,
  Eye
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/context/i18n.context";
import { useAdminCrud } from "@/features/dashboard/hooks/useAdminCrud";
import { DashboardEndpoints } from "@/features/dashboard/service/dashboard.endpoints";
import { useModalStore } from "@/shared/store/ui/useModalStore";
import { DynamicRenderForm } from "@/shared/components/organisms/DynamicForm/DynamicRenderForm";
import { DeleteAlert } from "@/shared/components/organisms/crud/AlertDelete";
import { apiClient } from "@/shared/api/api.client";
import { ensureString } from "@/shared/lib/utils";
import { UniversityFormModal } from "@/features/dashboard/components/UniversityFormModal";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { TransactionConfirmModal } from "@/features/dashboard/components/TransactionConfirmModal";

interface GenericCrudPageProps {
  entity?: string;
}

export default function GenericCrudPage({ entity: overrideEntity }: GenericCrudPageProps) {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();

  const entity = overrideEntity || (typeof params?.entity === 'string' ? params.entity : '');

  const ENTITY_CONFIG: Record<string, any> = {
    users: {
      title: t('dashboard.entities.users.title'),
      description: t('dashboard.entities.users.description'),
      icon: Users,
      columns: [
        t('dashboard.entities.users.columns.name'),
        t('dashboard.entities.users.columns.username'),
        t('dashboard.entities.users.columns.email'),
        t('dashboard.entities.users.columns.status'),
        t('dashboard.entities.users.columns.created')
      ],
      renderRow: (item: any) => (
        <>
          <td className="px-6 py-4 font-medium text-base-content">
            {item.firstName || item.lastName ? `${item.firstName ?? ''} ${item.lastName ?? ''}` : 'Sin nombre'}
          </td>
          <td className="px-6 py-4 text-base-content/70">@{item.username || 'n/a'}</td>
          <td className="px-6 py-4 text-base-content/70">{item.email}</td>
          <td className="px-6 py-4">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' :
                item.status === 'SUSPENDED' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400' :
                  'bg-base-200 text-base-content/70'
              }`}>
              {item.status || 'UNKNOWN'}
            </span>
          </td>
          <td className="px-6 py-4 text-base-content/70">
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
          </td>
        </>
      )
    },
    subscriptions: {
      title: t('dashboard.entities.subscriptions.title'),
      description: t('dashboard.entities.subscriptions.description'),
      icon: Layers,
      columns: [
        t('dashboard.entities.subscriptions.columns.plan'),
        t('dashboard.entities.subscriptions.columns.startDate'),
        t('dashboard.entities.subscriptions.columns.endDate'),
        t('dashboard.entities.subscriptions.columns.status'),
        t('dashboard.entities.subscriptions.columns.email'),
        t('dashboard.entities.subscriptions.columns.created')
      ],
      renderRow: (item: any) => (
        <>
          <td className="px-6 py-4 font-medium text-base-content">
            {item.plan?.name || 'Plan básico'}
          </td>
          <td className="px-6 py-4 text-base-content/70">
            {item.startDate ? new Date(item.startDate).toLocaleDateString() : '-'}
          </td>
          <td className="px-6 py-4 text-base-content/70">
            {item.endDate ? new Date(item.endDate).toLocaleDateString() : '-'}
          </td>
          <td className="px-6 py-4">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' :
                item.status === 'CANCELED' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' :
                  'bg-base-200 text-base-content/70'
              }`}>
              {item.status || 'UNKNOWN'}
            </span>
          </td>
          <td className="px-6 py-4 text-base-content/70">{item.user?.email || '-'}</td>
          <td className="px-6 py-4 text-base-content/70">
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
          </td>
        </>
      )
    },
    transactions: {
      title: t('dashboard.entities.transactions.title'),
      description: t('dashboard.entities.transactions.description'),
      icon: CreditCard,
      columns: [
        t('dashboard.entities.transactions.columns.reference'),
        t('dashboard.entities.transactions.columns.amount'),
        t('dashboard.entities.transactions.columns.status'),
        t('dashboard.entities.transactions.columns.type'),
        t('dashboard.entities.transactions.columns.method'),
        t('dashboard.entities.transactions.columns.user'),
        t('dashboard.entities.transactions.columns.created')
      ],
      renderRow: (item: any) => (
        <>
          <td className="px-6 py-4 font-mono font-medium text-base-content">
            {item.referenceCode || 'n/a'}
          </td>
          <td className="px-6 py-4 font-medium text-base-content">
            ${Number(item.amount || 0).toFixed(2)}
          </td>
          <td className="px-6 py-4">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.status === 'SUCCESS' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' :
                item.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400' :
                  item.status === 'FAILED' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' :
                    'bg-base-200 text-base-content/70'
              }`}>
              {item.status || 'UNKNOWN'}
            </span>
          </td>
          <td className="px-6 py-4 text-base-content/70 capitalize text-xs">
            {item.type || '-'}
          </td>
          <td className="px-6 py-4 text-base-content/70">
            {item.paymentMethod?.paymentMethod?.name || 'Manual'}
          </td>
          <td className="px-6 py-4 text-base-content/70">{item.user?.email || '-'}</td>
          <td className="px-6 py-4 text-base-content/70">
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
          </td>
        </>
      )
    },
    feedback: {
      title: 'Feedback de Usuarios',
      description: 'Listado de comentarios, sugerencias y reportes enviados por los usuarios.',
      icon: Users,
      columns: [
        'Mensaje',
        'Email Usuario',
        'Fecha'
      ],
      renderRow: (item: any) => (
        <>
          <td className="px-6 py-4 font-medium text-base-content max-w-md truncate">
            {item.message}
          </td>
          <td className="px-6 py-4 text-base-content/70">
            {item.user?.email || 'Anónimo'}
          </td>
          <td className="px-6 py-4 text-base-content/70">
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
          </td>
        </>
      )
    },
    'payment-methods': {
      title: 'Métodos de Pago de Usuarios',
      description: 'Gestión y visualización de tarjetas y métodos de pago registrados por los usuarios.',
      icon: CreditCard,
      columns: [
        'Usuario (Email)',
        'Proveedor',
        'Estado'
      ],
      renderRow: (item: any) => (
        <>
          <td className="px-6 py-4 font-medium text-base-content">
            {item.user?.email || '-'}
          </td>
          <td className="px-6 py-4 text-base-content/70">
            {item.paymentMethod?.name || 'Tarjeta/Otro'}
          </td>
          <td className="px-6 py-4">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.active ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
              }`}>
              {item.active ? 'Activo' : 'Inactivo'}
            </span>
          </td>
        </>
      )
    },
    permits: {
      title: 'Roles y Permisos',
      description: 'Gestión de roles de acceso y permisos asignables a los usuarios de la plataforma.',
      icon: Shield,
      columns: [
        'Nombre del Rol',
        'Descripción',
        'Permisos',
        'Fecha de Creación'
      ],
      renderRow: (item: any) => (
        <>
          <td className="px-6 py-4 font-semibold text-base-content">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-indigo-500" />
              {item.name || 'Sin nombre'}
            </div>
          </td>
          <td className="px-6 py-4 text-base-content/70 max-w-xs truncate">
            {item.description || '-'}
          </td>
          <td className="px-6 py-4">
            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400">
              {item.list?.length || 0} permisos
            </span>
          </td>
          <td className="px-6 py-4 text-base-content/70">
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
          </td>
        </>
      )
    },
    wallets: {
      title: 'Billeteras de Usuarios',
      description: 'Vista administrativa de todas las billeteras registradas en la plataforma.',
      icon: Wallet,
      columns: [
        'Usuario',
        'Balance',
        'Moneda',
        'Fecha de Creación'
      ],
      renderRow: (item: any) => (
        <>
          <td className="px-6 py-4 font-medium text-base-content">
            {item.user?.email || item.userId || '-'}
          </td>
          <td className="px-6 py-4">
            <span className={`font-bold ${
              Number(item.balance) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-base-content/50'
            }`}>
              ${Number(item.balance || 0).toFixed(2)}
            </span>
          </td>
          <td className="px-6 py-4 text-base-content/70">
            {item.currency || 'USD'}
          </td>
          <td className="px-6 py-4 text-base-content/70">
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
          </td>
        </>
      )
    },
    'system-payment-methods': {
      title: 'Métodos de Pago del Sistema',
      description: 'Configuración de los métodos de pago disponibles en la plataforma.',
      icon: CreditCard,
      columns: [
        'Nombre',
        'Código',
        'Estado',
        'Fecha de Creación'
      ],
      renderRow: (item: any) => (
        <>
          <td className="px-6 py-4 font-medium text-base-content">
            <div className="flex items-center gap-2">
              <CreditCard size={14} className="text-purple-500" />
              {item.name || '-'}
            </div>
          </td>
          <td className="px-6 py-4">
            <span className="px-2 py-1 text-xs font-mono font-semibold rounded bg-base-200 text-base-content/70">
              {item.code || '-'}
            </span>
          </td>
          <td className="px-6 py-4">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.active ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
              }`}>
              {item.active ? 'Activo' : 'Inactivo'}
            </span>
          </td>
          <td className="px-6 py-4 text-base-content/70">
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
          </td>
        </>
      )
    },
    cms: {
      title: 'Contenido Corporativo (CMS)',
      description: 'Gestión de documentos corporativos (Términos, Privacidad, Misión, Visión, Objetivos).',
      icon: FileText,
      columns: [
        'Clave',
        'Título',
        'Descripción',
        'Fecha de Creación'
      ],
      renderRow: (item: any) => (
        <>
          <td className="px-6 py-4 font-medium text-base-content">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-blue-500" />
              {item.key || '-'}
            </div>
          </td>
          <td className="px-6 py-4 font-medium text-base-content/70">
            {item.title || '-'}
          </td>
          <td className="px-6 py-4 text-base-content/70">
            {item.description || '-'}
          </td>
          <td className="px-6 py-4 text-base-content/70">
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
          </td>
        </>
      )
    },
    universities: {
      title: 'Universidades',
      description: 'Gestión de universidades e instituciones educativas.',
      icon: GraduationCap,
      columns: [
        'Nombre',
        'Nombre Corto',
        'Estado',
        'Fecha de Creación'
      ],
      renderRow: (item: any) => (
        <>
          <td className="px-6 py-4 font-medium text-base-content">
            <div className="flex items-center gap-2">
              <GraduationCap size={14} className="text-purple-500" />
              {item.name || '-'}
            </div>
          </td>
          <td className="px-6 py-4">
            <span className="px-2 py-1 text-xs font-mono font-semibold rounded bg-base-200 text-base-content/70">
              {item.shortName || '-'}
            </span>
          </td>
          <td className="px-6 py-4">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.isActive ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'}`}>
              {item.isActive ? 'Activa' : 'Inactiva'}
            </span>
          </td>
          <td className="px-6 py-4 text-base-content/70">
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
          </td>
        </>
      )
    },
  };

  const config = ENTITY_CONFIG[entity];

  // Opciones de rol para el filtro de usuarios (Permit.name)
  const { data: permitsData } = useQuery({
    queryKey: ["admin-user-permit-options"],
    queryFn: async () => {
      const { data } = await apiClient.get(DashboardEndpoints.api.permits, {
        params: { limit: 100 },
      });
      return (data?.list ?? []) as { id: string; name: string }[];
    },
    enabled: entity === "users",
    staleTime: 5 * 60 * 1000,
  });

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: "Administrador",
    USER: "Nutricionista",
    PATIENT: "Paciente",
    CLINIC: "Clínica",
  };

  const permitOptions = (permitsData ?? [])
    .filter((permit) => permit.name !== "SUPERADMIN")
    .map((permit) => ({
      name: permit.name,
      label: ROLE_LABELS[permit.name] ?? permit.name,
    }));

  const { openModal, closeModal } = useModalStore();

  const { user } = useAuthStore();

  const permissionsMap: Record<string, { create?: string; update?: string; delete?: string }> = {
    users: { update: "USER_UPDATE", delete: "USER_DELETE" },
    subscriptions: { update: "SUBSCRIPTION_UPDATE", delete: "SUBSCRIPTION_DELETE" },
    wallets: { update: "USER_WALLET_UPDATE" },
    "payment-methods": { update: "USER_PAYMENT_METHOD_UPDATE", delete: "USER_PAYMENT_METHOD_DELETE" },
    "system-payment-methods": { update: "PAYMENT_METHOD_UPDATE", delete: "PAYMENT_METHOD_DELETE" },
    cms: { create: "CMS_CREATED", update: "CMS_UPDATE", delete: "CMS_DELETE" },
    universities: { create: "UNIVERSITY_CREATED", update: "UNIVERSITY_UPDATED", delete: "UNIVERSITY_DELETED" },
  };

  const entityPerms = permissionsMap[entity];
  const userHasCreatePerm = entityPerms?.create ? user?.permits?.list?.includes(entityPerms.create) : true;
  const userHasUpdatePerm = entityPerms?.update ? user?.permits?.list?.includes(entityPerms.update) : true;
  const userHasDeletePerm = entityPerms?.delete ? user?.permits?.list?.includes(entityPerms.delete) : true;

  const supportsCreate = ['cms', 'universities'].includes(entity) && userHasCreatePerm;
  const supportsEdit = ['users', 'subscriptions', 'wallets', 'payment-methods', 'system-payment-methods', 'cms', 'universities'].includes(entity) && userHasUpdatePerm;
  const supportsDelete = ['users', 'subscriptions', 'payment-methods', 'system-payment-methods', 'cms', 'universities'].includes(entity) && userHasDeletePerm;

  const handleCreate = () => {
    let formPath = "";
    let sendPath = "";

    if (entity === 'cms') {
      formPath = `/api/cms/form/create`;
      sendPath = `/api/cms/create`;
    } else if (entity === 'universities') {
      openModal(
        <UniversityFormModal
          onClose={closeModal}
          onSuccess={() => {
            closeModal();
            fetchData({ page, limit: 10, q: searchTerm, status: statusFilter });
          }}
        />
      );
      return;
    }

    if (formPath) {
      openModal(
        <DynamicRenderForm
          path={formPath}
          pathSend={sendPath || undefined}
          cb={() => {
            closeModal();
            fetchData({
              page,
              limit: 10,
              q: searchTerm,
              status: statusFilter,
            });
          }}
        />
      );
    }
  };

  const handleUpdate = (item: any) => {
    let formPath = "";
    let sendPath = "";

    if (entity === 'users') {
      formPath = `/api/user/form/update?id=${item.id}`;
      sendPath = `/api/user/${item.id}/update`;
    } else if (entity === 'subscriptions') {
      formPath = `/api/user/form/subscription?id=${item.id}`;
      sendPath = `/api/user/subscriptions/${item.id}/update`;
    } else if (entity === 'wallets') {
      formPath = `/api/wallet/form/update?id=${item.id}`;
      sendPath = `/api/wallet/${item.id}/update`;
    } else if (entity === 'payment-methods') {
      formPath = `/api/user/form/payment-method?id=${item.id}&internal=update`;
      sendPath = `/api/user/payment-method/${item.id}/update`;
    } else if (entity === 'system-payment-methods') {
      formPath = `/api/payment-methods/form/update?id=${item.id}`;
      sendPath = `/api/payment-methods/${item.id}/update`;
    } else if (entity === 'cms') {
      formPath = `/api/cms/form/update?id=${item.id}`;
      sendPath = `/api/cms/${item.id}/update`;
    } else if (entity === 'universities') {
      openModal(
        <UniversityFormModal
          university={item}
          onClose={closeModal}
          onSuccess={() => {
            closeModal();
            fetchData({ page, limit: 10, q: searchTerm, status: statusFilter });
          }}
        />
      );
      return;
    }

    if (formPath) {
      openModal(
        <DynamicRenderForm
          path={formPath}
          pathSend={sendPath || undefined}
          cb={() => {
            closeModal();
            fetchData({
              page,
              limit: 10,
              q: searchTerm,
              status: statusFilter,
            });
          }}
        />
      );
    }
  };

  const handleDelete = (item: any) => {
    let deletePath = "";

    if (entity === 'users') {
      deletePath = `/api/user/${item.id}/delete`;
    } else if (entity === 'subscriptions') {
      deletePath = `/api/user/subscriptions/${item.id}/delete`;
    } else if (entity === 'payment-methods') {
      deletePath = `/api/user/payment-method/${item.id}/delete`;
    } else if (entity === 'system-payment-methods') {
      deletePath = `/api/payment-methods/${item.id}/delete`;
    } else if (entity === 'cms') {
      deletePath = `/api/cms/${item.id}/delete`;
    } else if (entity === 'universities') {
      openModal(
        <DeleteAlert
          isOpen={true}
          onClose={closeModal}
          onConfirm={async () => {
            try {
              await apiClient.delete(`/api/universities/${item.id}`);
            } catch (err) {
              console.error(err);
            }
            closeModal();
            fetchData({ page, limit: 10, q: searchTerm, status: statusFilter });
          }}
          title={`Eliminar "${item.name}"`}
          description="Esta acción desactivará la universidad. No se eliminarán las solicitudes de campus asociadas."
        />
      );
      return;
    }

    if (deletePath) {
      openModal(
        <DeleteAlert
          isOpen={true}
          onClose={closeModal}
          onConfirm={async () => {
            try {
              await apiClient.post(deletePath);
            } catch (err) {
              console.error(err);
            }
            closeModal();
            fetchData({
              page,
              limit: 10,
              q: searchTerm,
              status: statusFilter,
            });
          }}
        />
      );
    }
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [permitNames, setPermitNames] = useState<string[]>([]);
  const [emailVerified, setEmailVerified] = useState<"" | "true" | "false">("");

  const {
    data,
    loading,
    error,
    totalPages,
    total,
    fetchData: fetchDataRaw,
  } = useAdminCrud(entity);

  // Inyecta los filtros avanzados de usuarios en cada request del listado.
  const fetchData = useCallback(
    (params: { page: number; limit: number; q: string; status?: string }) =>
      fetchDataRaw({
        ...params,
        permitName: entity === "users" ? permitNames : undefined,
        emailVerified:
          entity === "users" && emailVerified !== ""
            ? emailVerified === "true"
            : undefined,
      }),
    [fetchDataRaw, entity, permitNames, emailVerified],
  );

  useEffect(() => {
    if (config) {
      fetchData({
        page,
        limit: 10,
        q: searchTerm,
        status: statusFilter,
      });
    }
  }, [entity, page, searchTerm, statusFilter, fetchData]);

  if (!config) {
    if (entity) return notFound();
    return null;
  }

  const Icon = config.icon || Settings;

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  return (
    <div className="space-y-6 pb-10 font-sans text-base-content/70">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-base-content flex items-center gap-2 capitalize">
            <Icon className="text-primary" />
            {ensureString(config.title)}
          </h1>
          <p className="text-base-content/70 mt-1 text-sm">{ensureString(config.description)}</p>
        </div>
        {supportsCreate && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors"
          >
            <Plus size={16} />
            Crear Nuevo
          </button>
        )}
      </div>

      {/* TOOLBAR GENÉRICO */}
      <div className="bg-base-100 p-4 rounded-xl border border-base-300 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 text-base-content/50" size={18} />
          <input
            type="text"
            placeholder={`${t('dashboard.entities.common.search_in')} ${ensureString(config.title)}...`}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-base-300 bg-base-200 focus:bg-base-100 focus:ring-2 focus:ring-blue-600/20 outline-none transition-all text-sm text-base-content"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-base-content/50" />
            <select
              className="bg-base-200 border border-base-300 rounded-lg text-sm text-base-content/70 py-2 px-3 outline-none focus:ring-2 focus:ring-blue-600/20"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos los Estados</option>
              {entity === 'users' && (
                <>
                  <option value="ACTIVE">Activo</option>
                  <option value="SUSPENDED">Suspendido</option>
                </>
              )}
              {entity === 'subscriptions' && (
                <>
                  <option value="ACTIVE">Activa</option>
                  <option value="CANCELED">Cancelada</option>
                </>
              )}
              {entity === 'transactions' && (
                <>
                  <option value="SUCCESS">Exitosa</option>
                  <option value="PENDING">Pendiente</option>
                  <option value="FAILED">Fallida</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* FILTROS AVANZADOS DE USUARIOS */}
      {entity === "users" && (
        <div className="bg-base-100 p-4 rounded-xl border border-base-300 shadow-sm flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-base-content/70 mr-1">
              Tipo de usuario
            </span>
            {permitOptions.length === 0 ? (
              <span className="text-xs text-base-content/50">Cargando roles...</span>
            ) : (
              permitOptions.map((permit) => {
                const active = permitNames.includes(permit.name);
                return (
                  <button
                    key={permit.name}
                    type="button"
                    onClick={() => {
                      setPage(1);
                      setPermitNames((prev) =>
                        prev.includes(permit.name)
                          ? prev.filter((name) => name !== permit.name)
                          : [...prev, permit.name],
                      );
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                      active
                        ? "bg-primary text-primary-content border-primary shadow-sm"
                        : "bg-base-200 text-base-content/70 border-base-300 hover:border-primary/40 hover:text-primary"
                    }`}
                  >
                    {permit.label}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-base-content/70">
                Correo verificado
              </span>
              <select
                className="bg-base-200 border border-base-300 rounded-lg text-sm text-base-content/70 py-2 px-3 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                value={emailVerified}
                onChange={(e) => {
                  setEmailVerified(e.target.value as "" | "true" | "false");
                  setPage(1);
                }}
              >
                <option value="">Todos</option>
                <option value="true">Verificado</option>
                <option value="false">No verificado</option>
              </select>
            </div>

            {(permitNames.length > 0 || emailVerified !== "") && (
              <button
                type="button"
                onClick={() => {
                  setPermitNames([]);
                  setEmailVerified("");
                  setPage(1);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-error border border-error/20 bg-error/10 hover:bg-error/20 transition-colors cursor-pointer"
              >
                <X size={14} /> Limpiar filtros
              </button>
            )}
          </div>
        </div>
      )}

      {/* ERROR MESSAGE */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* TABLA GENÉRICA */}
      <div className="bg-base-100 border border-base-300 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-base-200 border-b border-base-300 text-xs font-bold text-base-content/70 uppercase tracking-wider">
                {config.columns.map((col: any, idx: number) => (
                  <th key={idx} className="px-6 py-4">{ensureString(col)}</th>
                ))}
                <th className="px-6 py-4 text-right">{t('dashboard.entities.common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-300 text-sm">
              {loading ? (
                // Skeletons
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    {Array.from({ length: config.columns.length + 1 }).map((_, cIdx) => (
                      <td key={cIdx} className="px-6 py-4">
                        <div className="h-4 bg-base-200 rounded w-2/3"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={config.columns.length + 1} className="px-6 py-10 text-center text-base-content/50">
                    {t('dashboard.entities.common.no_data')}
                  </td>
                </tr>
              ) : (
                data.map((item: any) => (
                  <tr key={item.id} className="hover:bg-base-200/50 transition-colors">
                    {config.renderRow(item)}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {entity === 'transactions' && item.status === 'PENDING' && user?.permits?.list?.includes('TRANSACTION_UPDATE') && (
                          <>
                            <button
                              onClick={() => {
                                openModal(
                                  <TransactionConfirmModal
                                    transaction={item}
                                    action="approve"
                                    onClose={closeModal}
                                    onSuccess={() => {
                                      closeModal();
                                      fetchData({
                                        page,
                                        limit: 10,
                                        q: searchTerm,
                                        status: statusFilter,
                                      });
                                    }}
                                  />
                                );
                              }}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors"
                              title="Aprobar pago"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => {
                                openModal(
                                  <TransactionConfirmModal
                                    transaction={item}
                                    action="reject"
                                    onClose={closeModal}
                                    onSuccess={() => {
                                      closeModal();
                                      fetchData({
                                        page,
                                        limit: 10,
                                        q: searchTerm,
                                        status: statusFilter,
                                      });
                                    }}
                                  />
                                );
                              }}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                              title="Rechazar pago"
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                        {entity === 'users' && (
                          <button
                            onClick={() => router.push(`/dashboard/users/${item.id}`)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                            title="Ver ficha"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                        {supportsEdit && (
                          <button
                            onClick={() => handleUpdate(item)}
                            className="p-1.5 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg transition-colors"
                            title={t('actions.edit')}
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                        {supportsDelete && (
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                            title={t('actions.delete')}
                          >
                            <Trash size={16} />
                          </button>
                        )}
                        {!supportsEdit && !supportsDelete && !(entity === 'transactions' && item.status === 'PENDING' && user?.permits?.list?.includes('TRANSACTION_UPDATE')) && (
                          <span className="text-base-content/50 text-xs font-medium">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINACIÓN */}
        {!loading && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-base-300 flex items-center justify-between">
            <span className="text-xs text-base-content/70">
              Mostrando {data.length} de {total} registros
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-base-300 text-base-content/70 hover:bg-base-200 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-base-content font-medium">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-base-300 text-base-content/70 hover:bg-base-200 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}