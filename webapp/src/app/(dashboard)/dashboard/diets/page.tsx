"use client";

import { useTranslation } from "@/context/i18n.context";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { AgendaView } from "@/features/nutringest/diet/agenda/components/AgendaView";
import { CalendarDays, ArrowLeft } from 'lucide-react';

export default function ConsultationPage() {
  const { user } = useAuthStore();

  const canList = user?.permits?.list?.includes('CONSULTATION_LIST_OWN') ||
                  user?.permits?.list?.includes('CONSULTATION_LIST_ALL') ||
                  user?.permits?.name === 'SUPERADMIN';

  const { t } = useTranslation();

  if (!canList) {
    return (
      <div className="min-h-screen bg-base-100 p-4 md:p-8 font-sans text-base-content">
        <div className="mb-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-xs font-bold text-base-content/70 hover:text-success transition-colors uppercase tracking-wider"
          >
            <ArrowLeft size={16} /> Regresar
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <CalendarDays className="text-base-content/30" size={64} />
          <h2 className="text-xl font-bold text-base-content/70">Sin permisos de acceso</h2>
          <p className="text-base-content/50 text-sm">No tienes permisos para acceder a la agenda de consultas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 p-4 md:p-8 font-sans text-base-content animate-in fade-in duration-700">

      {/* Botón de Regresar */}
      <div className="mb-4">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-xs font-bold text-base-content/70 hover:text-primary transition-colors uppercase tracking-wider"
        >
          <ArrowLeft size={16} /> Regresar
        </button>
      </div>

      {/* Header con estilo Premium */}
      <div className="flex justify-between items-center mb-10 mt-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-base-content flex items-center gap-3 tracking-tighter uppercase">
            <div className="p-2.5 bg-gradient-to-br from-primary to-accent rounded-xl shadow-lg shadow-primary/25">
              <CalendarDays className="text-white w-7 h-7" />
            </div>
            {t('dashboard.consultations.agenda_title')}
          </h1>
          <p className="text-base-content/50 text-sm ml-14 font-medium italic">{t('dashboard.calendar.subtitle')}</p>
        </div>
      </div>

      <section className="animate-in slide-in-from-bottom-4 duration-700 delay-150">
        <AgendaView />
      </section>
    </div>
  );
}
