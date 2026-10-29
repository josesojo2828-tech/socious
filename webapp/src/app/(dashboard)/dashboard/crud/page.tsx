"use client";

import { useState } from "react";
import {
    CreditCard,
    Plus,
    Search,
    Filter,
    MoreVertical,
    Trash2,
    Edit2,
    CheckCircle2,
    AlertCircle,
    Download,
    Wallet
} from "lucide-react";

// Mock Data (Simulando respuesta de API)
const MOCK_DATA = [
    { id: 1, type: "Visa", last4: "4242", holder: "Juan Pérez", expiry: "12/24", status: "active", isDefault: true, lastUsed: "Hace 2 horas" },
    { id: 2, type: "Mastercard", last4: "8899", holder: "Juan Pérez", expiry: "08/25", status: "active", isDefault: false, lastUsed: "Hace 1 semana" },
    { id: 3, type: "PayPal", last4: "juan@...", holder: "Juan Pérez", expiry: "-", status: "expired", isDefault: false, lastUsed: "Hace 3 meses" },
    { id: 4, type: "Visa", last4: "1234", holder: "Empresa S.A.", expiry: "01/24", status: "error", isDefault: false, lastUsed: "Falló ayer" },
];

import { useTranslation } from "@/context/i18n.context";

// ... mocks and imports ...

export default function PaymentMethodsPage() {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");

    // Lógica simple de filtrado
    const filteredData = MOCK_DATA.filter(item => {
        const matchesSearch = item.last4.includes(searchTerm) || item.holder.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === "all" || item.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-6 pb-10 font-sans text-base-content/70">

            {/* 1. Encabezado con Acción Principal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-base-content flex items-center gap-2">
                        <Wallet className="text-primary" /> {t('dashboard.payment_methods.title')}
                    </h1>
                    <p className="text-base-content/70 mt-1 text-sm">{t('dashboard.payment_methods.subtitle')}</p>
                </div>
                <button className="btn btn-primary bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-all shadow-lg shadow-primary/30 flex items-center gap-2">
                    <Plus size={18} />
                    {t('dashboard.payment_methods.new_method')}
                </button>
            </div>

            {/* 2. Sección de Métricas (Gráficos Simples) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Resumen Total */}
                <div className="bg-base-100 p-5 rounded-xl border border-base-300 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <CreditCard size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-base-content/50 uppercase">{t('dashboard.payment_methods.active_cards')}</p>
                        <h3 className="text-2xl font-bold text-base-content">3</h3>
                    </div>
                </div>

                {/* Card 2: Estado de Salud (Visual Bar) */}
                <div className="bg-base-100 p-5 rounded-xl border border-base-300 shadow-sm md:col-span-2 flex flex-col justify-center">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-semibold text-base-content/70">{t('dashboard.payment_methods.status_title')}</span>
                        <span className="text-xs text-base-content/50">{t('dashboard.payment_methods.total')}: 4</span>
                    </div>
                    {/* Barra de Progreso Multi-color */}
                    <div className="w-full h-3 bg-base-200 rounded-full overflow-hidden flex">
                        <div className="h-full bg-emerald-500 w-[75%]" title="Activos"></div>
                        <div className="h-full bg-amber-400 w-[10%]" title="Expirados"></div>
                        <div className="h-full bg-red-500 w-[15%]" title="Errores"></div>
                    </div>
                    <div className="flex gap-4 mt-3 text-xs text-base-content/70">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> {t('dashboard.payment_methods.active')} (75%)</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400"></div> {t('dashboard.payment_methods.expired')} (10%)</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> {t('dashboard.payment_methods.error')} (15%)</span>
                    </div>
                </div>
            </div>

            {/* 3. Toolbar: Filtros y Búsqueda */}
            <div className="bg-base-100 p-4 rounded-xl border border-base-300 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">

                {/* Izquierda: Buscador */}
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-2.5 text-base-content/50" size={18} />
                    <input
                        type="text"
                        placeholder={t('dashboard.payment_methods.search_placeholder')}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-base-300 bg-base-200 focus:bg-base-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-base-content"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Derecha: Filtros y Acciones en Lote */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative group">
                        <button className="flex items-center gap-2 px-3 py-2 border border-base-300 rounded-lg text-sm text-base-content/70 hover:bg-base-200 transition-colors">
                            <Filter size={16} />
                            <span className="hidden sm:inline">{t('dashboard.payment_methods.status_filter')}:</span>
                            <span className="font-semibold text-base-content capitalize">
                                {filterStatus === 'all' ? t('dashboard.payment_methods.all') : filterStatus}
                            </span>
                        </button>
                        {/* Dropdown Simulado (Hover) */}
                        <div className="absolute right-0 mt-2 w-40 bg-base-100 border border-base-300 shadow-xl rounded-lg py-1 hidden group-hover:block z-10">
                            {['all', 'active', 'expired', 'error'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className="w-full text-left px-4 py-2 text-sm text-base-content/70 hover:bg-base-200 capitalize"
                                >
                                    {status === 'all' ? t('dashboard.payment_methods.all') : status}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button className="p-2 text-base-content/50 hover:text-base-content border border-base-300 rounded-lg hover:bg-base-200" title={t('dashboard.tabs.export')}>
                        <Download size={18} />
                    </button>
                </div>
            </div>

            {/* 4. Tabla de Datos */}
            <div className="bg-base-100 border border-base-300 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-base-200 border-b border-base-300 text-xs font-bold text-base-content/70 uppercase tracking-wider">
                                <th className="px-6 py-4">{t('dashboard.payment_methods.table.method')}</th>
                                <th className="px-6 py-4">{t('dashboard.payment_methods.table.holder')}</th>
                                <th className="px-6 py-4">{t('dashboard.payment_methods.table.expiry')}</th>
                                <th className="px-6 py-4">{t('dashboard.payment_methods.table.status')}</th>
                                <th className="px-6 py-4 text-right">{t('dashboard.payment_methods.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-base-300 text-sm">
                            {filteredData.length > 0 ? (
                                filteredData.map((item) => (
                                    <tr key={item.id} className="hover:bg-base-200/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-base-200 flex items-center justify-center text-base-content/70 shrink-0">
                                                    {item.type === 'PayPal' ? (
                                                        <span className="font-bold text-xs">PP</span>
                                                    ) : (
                                                        <CreditCard size={20} />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-base-content flex items-center gap-2">
                                                        {item.type} •••• {item.last4}
                                                    </div>
                                                    <p className="text-xs text-base-content/50">{item.lastUsed}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-base-content/70 font-medium">
                                            {item.holder}
                                        </td>
                                        <td className="px-6 py-4 text-base-content/70">
                                            {item.expiry}
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.status === 'active' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> {t('dashboard.payment_methods.active')}
                                                </span>
                                            )}
                                            {item.status === 'expired' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> {t('dashboard.payment_methods.expired')}
                                                </span>
                                            )}
                                            {item.status === 'error' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/50">
                                                    <AlertCircle size={12} /> {t('dashboard.payment_methods.error')}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-2 text-base-content/50 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" title={t('form.buttons.edit')}>
                                                    <Edit2 size={16} />
                                                </button>
                                                <button className="p-2 text-base-content/50 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors" title={t('form.buttons.delete')}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-base-content/50">
                                            <Search size={48} className="mb-4 opacity-20" />
                                            <p className="text-lg font-medium text-base-content/70">{t('dashboard.payment_methods.empty.title')}</p>
                                            <p className="text-sm">{t('dashboard.payment_methods.empty.subtitle')}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer: Paginación Simple */}
                <div className="bg-base-200 px-6 py-4 border-t border-base-300 flex items-center justify-between">
                    <span className="text-xs text-base-content/70">{t('dashboard.payment_methods.pagination.showing')} <span className="font-bold text-base-content">{filteredData.length}</span> {t('dashboard.payment_methods.pagination.of')} 4 {t('dashboard.payment_methods.pagination.results')}</span>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 text-xs font-medium bg-base-100 border border-base-300 rounded-md text-base-content/50 cursor-not-allowed">{t('dashboard.payment_methods.pagination.prev')}</button>
                        <button className="px-3 py-1 text-xs font-medium bg-base-100 border border-base-300 rounded-md text-base-content/70 hover:bg-base-200 hover:text-primary transition-colors">{t('dashboard.payment_methods.pagination.next')}</button>
                    </div>
                </div>
            </div>

        </div>
    );
}