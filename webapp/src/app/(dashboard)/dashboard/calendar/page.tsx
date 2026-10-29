"use client";

import { useState } from "react";
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Plus,
    Clock,
    MapPin,
    Video,
    MoreVertical,
    User,
    Search,
    Filter
} from "lucide-react";

// Mock Data: Eventos del mes
const EVENTS = [
    { id: 1, title: "Consulta Inicial - María G.", type: "consultation", date: 23, time: "09:00 AM", duration: "1h", status: "confirmed", platform: "Google Meet" },
    { id: 2, title: "Revisión Plan - Juan P.", type: "followup", date: 23, time: "11:30 AM", duration: "30m", status: "confirmed", platform: "Zoom" },
    { id: 3, title: "Almuerzo", type: "personal", date: 23, time: "01:00 PM", duration: "1h", status: "confirmed", platform: "-" },
    { id: 4, title: "Consulta - Carlos D.", type: "consultation", date: 23, time: "03:00 PM", duration: "45m", status: "pending", platform: "Presencial" },
    { id: 5, title: "Webinar Nutrición", type: "event", date: 25, time: "10:00 AM", duration: "2h", status: "confirmed", platform: "Youtube" },
    { id: 6, title: "Consulta - Ana R.", type: "consultation", date: 28, time: "04:00 PM", duration: "1h", status: "confirmed", platform: "Google Meet" },
];

// Días del mes actual (Noviembre ejemplo simplificado)
// En una app real, usarías date-fns o dayjs para generar esto dinámicamente
const DAYS_IN_MONTH = Array.from({ length: 30 }, (_, i) => i + 1);
const START_DAY_OFFSET = 5; // El mes empieza un Viernes (ejemplo)

import { useTranslation } from "@/context/i18n.context";

export default function CalendarPage() {
    const { t } = useTranslation();
    const [selectedDate, setSelectedDate] = useState<number>(23);
    const [view, setView] = useState<"month" | "week">("month");

    // Filtrar eventos del día seleccionado
    const dayEvents = EVENTS.filter(e => e.date === selectedDate);
    const weekdays = [
        t('dashboard.calendar.weekdays.mon'),
        t('dashboard.calendar.weekdays.tue'),
        t('dashboard.calendar.weekdays.wed'),
        t('dashboard.calendar.weekdays.thu'),
        t('dashboard.calendar.weekdays.fri'),
        t('dashboard.calendar.weekdays.sat'),
        t('dashboard.calendar.weekdays.sun')
    ];

    // Helper para colores según tipo
    const getEventColor = (type: string) => {
        switch (type) {
            case 'consultation': return 'bg-emerald-100 text-emerald-700 border-blue-200';
            case 'followup': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'personal': return 'bg-slate-100 text-slate-700 border-slate-200';
            case 'event': return 'bg-purple-100 text-purple-700 border-purple-200';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col font-sans text-slate-600">

            {/* 1. Toolbar Superior */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <CalendarIcon className="text-primary" /> {t('dashboard.calendar.title')}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">{t('dashboard.calendar.subtitle')}</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Selector de Mes */}
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                        <button className="p-1 hover:bg-slate-50 rounded-md text-slate-500"><ChevronLeft size={20} /></button>
                        <span className="px-4 font-semibold text-slate-700 w-32 text-center">Noviembre 2025</span>
                        <button className="p-1 hover:bg-slate-50 rounded-md text-slate-500"><ChevronRight size={20} /></button>
                    </div>

                    {/* Selector de Vista */}
                    <div className="hidden sm:flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                        <button
                            onClick={() => setView("month")}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {t('dashboard.calendar.views.month')}
                        </button>
                        <button
                            onClick={() => setView("week")}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {t('dashboard.calendar.views.week')}
                        </button>
                    </div>

                    <button className="btn btn-primary bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 shadow-lg shadow-primary/30 flex items-center gap-2 ml-auto md:ml-0">
                        <Plus size={18} /> <span className="hidden sm:inline">{t('dashboard.calendar.new_appointment')}</span>
                    </button>
                </div>
            </div>

            {/* 2. Layout Principal (Grid + Sidebar) */}
            <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">

                {/* A. Calendario Grande */}
                <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                    {/* Días de la semana Header */}
                    <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                        {Array.isArray(weekdays) && weekdays.map(day => (
                            <div key={day} className="py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Grid de Días */}
                    <div className="flex-1 grid grid-cols-7 auto-rows-fr">
                        {/* Espaciadores para empezar el mes en el día correcto */}
                        {Array.from({ length: START_DAY_OFFSET }).map((_, i) => (
                            <div key={`empty-${i}`} className="bg-slate-50/30 border-b border-r border-slate-100"></div>
                        ))}

                        {/* Días Reales */}
                        {DAYS_IN_MONTH.map((day) => {
                            const hasEvents = EVENTS.some(e => e.date === day);
                            const isSelected = selectedDate === day;
                            const isToday = day === 15; // Simulación de "Hoy"

                            return (
                                <div
                                    key={day}
                                    onClick={() => setSelectedDate(day)}
                                    className={`
                                relative p-2 border-b border-r border-slate-100 cursor-pointer transition-colors hover:bg-slate-50 group min-h-[80px]
                                ${isSelected ? 'bg-emerald-50/50' : ''}
                            `}
                                >
                                    <span className={`
                                w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium
                                ${isToday ? 'bg-primary text-white' : 'text-slate-700 group-hover:bg-white group-hover:shadow-sm'}
                            `}>
                                        {day}
                                    </span>

                                    {/* Indicadores de Eventos (Puntos) */}
                                    {hasEvents && (
                                        <div className="mt-2 space-y-1">
                                            {EVENTS.filter(e => e.date === day).slice(0, 3).map((ev, idx) => (
                                                <div key={idx} className={`hidden md:block text-[10px] truncate px-1.5 py-0.5 rounded border ${getEventColor(ev.type)}`}>
                                                    {ev.time.split(' ')[0]} {ev.title}
                                                </div>
                                            ))}
                                            {/* Versión móvil (solo puntos) */}
                                            <div className="md:hidden flex justify-center gap-0.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* B. Agenda del Día (Sidebar Derecho) */}
                <div className="w-full lg:w-96 flex flex-col gap-6 shrink-0 h-full overflow-hidden">

                    {/* Mini Calendario / Resumen Fecha */}
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm shrink-0">
                        <h2 className="text-lg font-bold text-slate-900 mb-1">
                            Sábado, {selectedDate} Nov
                        </h2>
                        <p className="text-slate-500 text-sm mb-4">4 {t('dashboard.calendar.events_today')}</p>

                        <div className="flex gap-2">
                            <div className="flex-1 bg-emerald-50 rounded-lg p-3 border border-blue-100 text-center">
                                <span className="block text-xl font-bold text-emerald-700">3</span>
                                <span className="text-xs font-medium text-emerald-600 uppercase">{t('dashboard.calendar.stats.consultations')}</span>
                            </div>
                            <div className="flex-1 bg-emerald-50 rounded-lg p-3 border border-emerald-100 text-center">
                                <span className="block text-xl font-bold text-emerald-700">1</span>
                                <span className="text-xs font-medium text-emerald-600 uppercase">{t('dashboard.calendar.stats.completed')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Lista de Horarios (Timeline) */}
                    <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">{t('dashboard.calendar.schedule')}</h3>
                            <button className="text-slate-400 hover:text-slate-600"><Filter size={16} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {dayEvents.length > 0 ? (
                                dayEvents.map((ev) => (
                                    <div key={ev.id} className="relative pl-4 group">
                                        {/* Línea de tiempo vertical */}
                                        <div className="absolute left-0 top-2 bottom-0 w-0.5 bg-slate-100 group-last:bottom-auto group-last:h-full"></div>
                                        <div className={`absolute left-[-2px] top-2 w-1.5 h-1.5 rounded-full border border-white ring-2 ring-slate-200 bg-slate-400`}></div>

                                        <div className={`p-3 rounded-lg border ${getEventColor(ev.type)} hover:shadow-md transition-shadow bg-opacity-50`}>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-xs font-bold opacity-80 flex items-center gap-1">
                                                    <Clock size={12} /> {ev.time} ({ev.duration})
                                                </span>
                                                <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreVertical size={14} />
                                                </button>
                                            </div>

                                            <h4 className="font-bold text-sm mb-1">{ev.title}</h4>

                                            <div className="flex items-center gap-3 text-xs opacity-70 mt-2">
                                                {ev.platform !== '-' && (
                                                    <span className="flex items-center gap-1">
                                                        {ev.platform === 'Presencial' ? <MapPin size={12} /> : <Video size={12} />}
                                                        {ev.platform}
                                                    </span>
                                                )}
                                                {ev.status === 'pending' && (
                                                    <span className="text-amber-600 font-bold bg-amber-100 px-1.5 rounded">{t('dashboard.calendar.pending')}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                                    <CalendarIcon size={48} className="mb-3 opacity-20" />
                                    <p className="text-sm">{t('dashboard.calendar.no_events')}</p>
                                    <button className="mt-4 text-primary text-sm font-medium hover:underline">
                                        {t('dashboard.calendar.add_event')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
}