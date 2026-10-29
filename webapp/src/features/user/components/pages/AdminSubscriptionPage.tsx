"use client";

import { useState } from 'react';
import { GenerateCrud } from '@/shared/components/organisms/crud';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { Text } from '@/shared/components/atoms/Text';
import { useTranslation } from "@/context/i18n.context";
import { SubscriptionPlanEndpoints } from '@/features/subscription/services/subscription.endpoints';
import { FichaSubscriptionPlan } from '../subscription/SubscriptionPlanFichaPage';
import { FichaSubscription } from '../subscription/SubscriptionFichaPage';
import { UserEndpoints } from '../../services/user.endpoints';
export default function AdminSubscriptionPage() {
  const { t } = useTranslation();
  const { openModal } = useModalStore();

  const HandleFichaPlan = (id: string, HandleDelete: (id: string) => void, HandleUpdate: (id: string) => void) => {
    openModal(<FichaSubscriptionPlan id={id} HandleDelete={HandleDelete} HandleUpdate={HandleUpdate} />);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 md:p-8 space-y-10 animate-fade-in">
      <div className="flex flex-col gap-2">
        <Text as={'h2'} variant={'h1'}>{t('common.subscription.admin_title') || 'Panel de Suscripciones'}</Text>
        <p className="text-base-content/70 text-sm">Gestiona la facturación, los planes de precios y el estado de los miembros del sitio.</p>
      </div>

      <div className="space-y-4">
        <GenerateCrud
          path={{
            list: SubscriptionPlanEndpoints.data.list,
            create: SubscriptionPlanEndpoints.form.create,
            view: SubscriptionPlanEndpoints.data.unique,
            update: SubscriptionPlanEndpoints.form.update,
            delete: SubscriptionPlanEndpoints.actions.delete,
            sendCreate: SubscriptionPlanEndpoints.actions.create,
            sendUpdate: SubscriptionPlanEndpoints.actions.update,
          }}
          object='subscription-plan'
          fichaComponent={HandleFichaPlan}
        />
      </div>
    </div>
  );
}
