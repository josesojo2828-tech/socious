"use client";

import { useCallback, useState } from 'react';
import { UserEndpoints } from '@/features/user';
import { GenerateCrud } from '@/shared/components/organisms/crud';
import { ArchiveConfirmModal } from '@/shared/components/organisms/crud/ArchiveConfirmModal';
import { redirect } from 'next/navigation';
import { Users, Archive, ArchiveRestore, Trash } from 'lucide-react';
import { apiClient } from '@/shared/api/api.client';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { useTranslation } from '@/context/i18n.context';
import { Button } from '@/shared/components/atoms/Button';
import { DeleteAlert } from '@/shared/components/organisms/crud/AlertDelete';

const getActiveTeamMembers = (entity: any): number => {
    const memberships =
        entity?.patientProfile?.nutritionists ??
        entity?.nutritionists ??
        entity?.patientProfiles?.[0]?.nutritionists ??
        [];

    if (!Array.isArray(memberships)) return 0;

    return memberships.filter((m: any) => m?.isActive === true).length;
};

const renderPatientCell = (field: string, entity: any) => {
    if (field !== 'firstName') return undefined;

    const activeMembers = getActiveTeamMembers(entity);
    const displayName = entity?.patientProfile?.firstName || entity?.firstName || '';

    return (
        <div className="flex items-center gap-2" translate="no">
            <span className={`font-medium notranslate ${entity?.isActive === false ? 'text-base-content/50 line-through' : 'text-base-content'}`}>
                {displayName}
            </span>
            {activeMembers > 1 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border bg-indigo-50 text-indigo-700 border-indigo-200">
                    <Users size={12} />
                    Equipo ({activeMembers})
                </span>
            )}
        </div>
    );
};

export default function PatientsPage() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { addToast } = useToastStore();
    const { openModal, closeModal } = useModalStore();
    const [activeTab, setActiveTab] = useState(0);

    // Permiso para archivar:
    // - Admin: tiene PATIENT_DELETE o PATIENT_LIST_ALL
    // - Nutricionista: tiene PATIENT_LIST_OWN (el backend ya filtra por su ID)
    const canArchive =
        user?.permits?.list?.includes('PATIENT_DELETE') ||
        user?.permits?.list?.includes('PATIENT_LIST_ALL') ||
        user?.permits?.list?.includes('PATIENT_LIST_OWN');

    const HandleFicha = (id: string) => {
        redirect(`/dashboard/patients/${id}`);
    }

    // --- Unarchive action ---
    const handleUnarchive = useCallback(
        async (entity: any) => {
            try {
                await apiClient.post(UserEndpoints.actions.patient.unarchive(entity.id));
                addToast({
                    type: 'success',
                    title: t('dashboard.patients.unarchive_success') || 'Paciente desarchivado',
                    message: t('dashboard.patients.unarchive_success_message') || `Paciente "${entity.firstName} ${entity.lastName}" restaurado.`,
                });
            } catch (err: any) {
                const msg = err?.response?.data?.message || 'Error al desarchivar paciente';
                addToast({ type: 'error', title: 'Error', message: msg });
            }
        },
        [addToast, t]
    );

    // --- Permanent delete action (for archived patients) ---
    const handlePermanentDelete = useCallback(
        async (entity: any) => {
            try {
                await apiClient.post(UserEndpoints.actions.patient.delete(entity.id));
                addToast({
                    type: 'success',
                    title: t('dashboard.patients.delete_success') || 'Paciente eliminado',
                    message: t('dashboard.patients.delete_success_message') || `Paciente "${entity.firstName} ${entity.lastName}" eliminado permanentemente.`,
                });
            } catch (err: any) {
                const msg = err?.response?.data?.message || 'Error al eliminar paciente';
                addToast({ type: 'error', title: 'Error', message: msg });
            }
        },
        [addToast, t]
    );

    // --- Reusable archive/unarchive button ---
    const renderArchiveButton = (item: any, openModalFn: (view: React.ReactNode) => void) => {
        const isArchived = item?.patientProfile?.isActive === false || item?.isActive === false;

        return (
            <div className="flex items-center gap-1">
                {isArchived ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="!p-0 !w-8 !h-8 !min-h-8 !min-w-8 text-amber-500 hover:bg-amber-100"
                        title={t('dashboard.patients.unarchive') || 'Desarchivar'}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleUnarchive(item);
                        }}
                    >
                        <ArchiveRestore size={16} />
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="!p-0 !w-8 !h-8 !min-h-8 !min-w-8 text-amber-500 hover:bg-amber-100"
                        title={t('dashboard.patients.archive') || 'Archivar'}
                        onClick={(e) => {
                            e.stopPropagation();
                            openModalFn(
                                <ArchiveConfirmModal
                                    patientId={item.id}
                                    patientName={`${item.firstName} ${item.lastName}`}
                                    onClose={closeModal}
                                    onSuccess={() => {}}
                                />
                            );
                        }}
                    >
                        <Archive size={16} />
                    </Button>
                )}
            </div>
        );
    };

    // --- Delete button for archived patients ---
    const renderDeleteButton = (item: any, openModalFn: (view: React.ReactNode) => void) => {
        return (
            <Button
                variant="ghost"
                size="sm"
                className="!p-0 !w-8 !h-8 !min-h-8 !min-w-8 text-red-500 hover:bg-red-100"
                title={t('common.actions.delete') || 'Eliminar'}
                onClick={(e) => {
                    e.stopPropagation();
                    openModalFn(
                        <DeleteAlert
                            isOpen={true}
                            onClose={closeModal}
                            onConfirm={() => handlePermanentDelete(item)}
                        />
                    );
                }}
            >
                <Trash size={16} />
            </Button>
        );
    };

    // --- Extra actions factory ---
    const buildExtraActions = (item: any, openModalFn: (view: React.ReactNode) => void) => {
        // Si no tiene permiso, no mostrar nada
        if (!canArchive) return null;

        const isArchived = item?.patientProfile?.isActive === false || item?.isActive === false;

        if (isArchived) {
            // Archived: unarchive + delete
            return (
                <div className="flex items-center gap-1">
                    {renderArchiveButton(item, openModalFn)}
                    {renderDeleteButton(item, openModalFn)}
                </div>
            );
        }

        // Active: archive only
        return renderArchiveButton(item, openModalFn);
    };

    // Actions override: hide view/edit when on archived tab
    const actionsOverride = activeTab === 1
        ? { view: false, update: false }
        : undefined;

    return (
        <GenerateCrud
            path={{
                list: UserEndpoints.actions.patient.list(),
                create: UserEndpoints.form.patient.create,
                view: UserEndpoints.actions.patient.unique,
                update: UserEndpoints.form.patient.update,
                delete: UserEndpoints.actions.patient.delete,
                sendCreate: UserEndpoints.actions.patient.create,
                sendUpdate: (id: string) => UserEndpoints.actions.patient.update(id),
            }}
            fichaComponent={HandleFicha}
            object="patient"
            title="Pacientes"
            renderCell={renderPatientCell}
            tabs={[
                {
                    label: t('dashboard.patients.tabs.active') || 'Activos',
                    queryParam: { includeArchived: false },
                },
                {
                    label: t('dashboard.patients.tabs.archived') || 'Archivados',
                    queryParam: { includeArchived: true },
                },
            ]}
            userPermits={user?.permits?.list ?? []}
            extraActions={buildExtraActions}
            actionsOverride={actionsOverride}
            onTabChange={setActiveTab}
            openModal={openModal}
        />
    );
}
