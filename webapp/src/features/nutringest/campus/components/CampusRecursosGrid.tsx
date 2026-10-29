"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
    BookOpen, 
    Search, 
    Eye, 
    Download, 
    Sparkles, 
    Lock, 
    CheckCircle, 
    FileText, 
    GraduationCap,
    X,
    ArrowRight,
    ShieldCheck,
    Plus
} from "lucide-react";
import { 
    RECURSOS, 
    CATEGORIAS, 
    TYPES_FILTERS, 
    type RecursoDidactico, 
    type RecursoTier, 
    type RecursoType, 
    type RecursoCategory 
} from "../data/recursos";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { isAdmin } from "@/shared/authz";
import { CreateRecursoModal } from "./CreateRecursoModal";
import { RecursoCheckoutModal } from "./RecursoCheckoutModal";
import { CreatorEarningsTab, type CampusTransaction } from "./CreatorEarningsTab";
import { CampusIconLibrary } from "../data/campusIcons";

interface CampusRecursosGridProps {
    showActions?: boolean;
    className?: string;
    onDownload?: (recurso: RecursoDidactico) => void;
    theme?: "light" | "dark";
}

export function CampusRecursosGrid({
    showActions = true,
    className = "",
    onDownload,
    theme = "light",
}: CampusRecursosGridProps) {
    const router = useRouter();
    const { user } = useAuthStore();
    
    // Permission check for premium resources
    const activeSub = user?.subscriptions?.find((s: any) => s.status === 'ACTIVE') || user?.subscriptions?.[0];
    const planName = (activeSub?.plan?.name || '').toUpperCase();
    const isAdminOrSuperAdmin = isAdmin(user);

    const isPremiumUser = Boolean(
        isAdminOrSuperAdmin || 
        activeSub?.status === "ACTIVE" ||
        planName.includes("PREMIUM") ||
        planName.includes("PRO") ||
        planName.includes("ESTUDIANTE") ||
        (user?.subscriptions && user.subscriptions.length > 0 && planName !== "FREE") ||
        user?.permits?.list?.includes("CAMPUS_PREMIUM")
    );

    const [recursosList, setRecursosList] = useState<RecursoDidactico[]>(RECURSOS);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedType, setSelectedType] = useState<string>("Todos");
    const [selectedCategory, setSelectedCategory] = useState<string>("Todas");
    
    // Phase 3: Tab switcher & Paid resources states
    const [activeTab, setActiveTab] = useState<"CATALOG" | "CREATOR_LEDGER">("CATALOG");
    const [checkoutResource, setCheckoutResource] = useState<RecursoDidactico | null>(null);
    const [purchasedResourceIds, setPurchasedResourceIds] = useState<string[]>([]);
    const [transactions, setTransactions] = useState<CampusTransaction[]>([]);

    // Modal states
    const [lockedResourceModal, setLockedResourceModal] = useState<RecursoDidactico | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const handleResourceCreated = (newRecurso: RecursoDidactico) => {
        setRecursosList((prev) => [newRecurso, ...prev]);
    };

    const handleSuccessPurchase = (purchasedId: string) => {
        setPurchasedResourceIds((prev) => [...prev, purchasedId]);

        if (checkoutResource) {
            const itemPrice = checkoutResource.price || 14.99;
            const fee = Math.round(itemPrice * 0.1 * 100) / 100;
            const net = Math.round((itemPrice - fee) * 100) / 100;

            const newTx: CampusTransaction = {
                id: `tx_${Date.now()}`,
                resourceTitle: checkoutResource.title,
                date: "Hoy",
                grossAmount: itemPrice,
                platformFee: fee,
                netEarnings: net,
                status: "COMPLETED",
            };

            setTransactions((prev) => [newTx, ...prev]);
        }
    };

    const filteredRecursos = recursosList
        .filter((recurso) => {
            const matchesSearch =
                recurso.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                recurso.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                recurso.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesType =
                selectedType === "Todos" || recurso.type === selectedType;

            const matchesCategory =
                selectedCategory === "Todas" || recurso.category === selectedCategory;

            return matchesSearch && matchesType && matchesCategory;
        })
        .sort((a, b) => {
            // Priorización de publicaciones oficiales (Nutringest Official)
            const aIsOfficial = a.author?.isOfficial ? 1 : 0;
            const bIsOfficial = b.author?.isOfficial ? 1 : 0;
            return bIsOfficial - aIsOfficial;
        });

    const handleActionView = (recurso: RecursoDidactico) => {
        // Manejo de recursos pagos individuales (PAID)
        if (recurso.tier === "PAID" && !purchasedResourceIds.includes(recurso.id)) {
            setCheckoutResource(recurso);
            return;
        }
        if (recurso.tier === "PREMIUM" && !isPremiumUser) {
            setLockedResourceModal(recurso);
            return;
        }
        router.push(`/dashboard/campus/recursos/${recurso.id}`);
    };

    const handleActionDownload = (recurso: RecursoDidactico) => {
        if (recurso.tier === "PAID" && !purchasedResourceIds.includes(recurso.id)) {
            setCheckoutResource(recurso);
            return;
        }
        if (recurso.tier === "PREMIUM" && !isPremiumUser) {
            setLockedResourceModal(recurso);
            return;
        }
        if (onDownload) {
            onDownload(recurso);
        } else {
            router.push(`/dashboard/campus/recursos/${recurso.id}?print=true`);
        }
    };

    return (
        <section id="campus-recursos" className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12 ${className}`}>
            {/* Header Principal con branding Nutringest */}
            <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80 mb-4 shadow-xs">
                    <Sparkles size={14} className="text-emerald-600" />
                    <span>Recursos Clínicos & Didácticos</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                    Campus Nutringest
                </h1>
                <p className="mt-3 text-slate-500 font-medium text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
                    Explorá fichas visuales, guías descargables, herramientas y material educativo oficial de alto impacto para tu formación y práctica profesional.
                </p>
            </div>

            {/* Widget de Membresía / Indicador de Acceso */}
            <div className="mb-8 p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800">
                <div className="flex items-center gap-3.5 text-center sm:text-left">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <ShieldCheck size={22} />
                    </div>
                    <div>
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                            <span className="font-black text-sm text-white">
                                {isPremiumUser 
                                    ? (activeSub?.plan?.name ? `Plan ${activeSub.plan.name} Activo` : "Plan Premium / Estudiante Activo") 
                                    : "Plan Gratuito / Básico"}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                isPremiumUser 
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}>
                                {isPremiumUser ? "Acceso Ilimitado" : "Acceso Limitado"}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                            {isPremiumUser 
                                ? "Tienes acceso total a todas las fichas visuales, plantillas Excel y e-books clínicos de Nutringest." 
                                : "Tienes acceso a recursos gratuitos. Suscríbete para desbloquear el catálogo completo."}
                        </p>
                    </div>
                </div>

                {isAdminOrSuperAdmin ? (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/20 shrink-0 cursor-pointer border-none flex items-center gap-2"
                    >
                        <Plus size={16} />
                        <span>Publicar Recurso (Admin)</span>
                    </button>
                ) : !isPremiumUser ? (
                    <button 
                        onClick={() => router.push("/dashboard/campus/solicitar")}
                        className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/20 shrink-0 cursor-pointer border-none"
                    >
                        Solicitar Acceso Estudiante
                    </button>
                ) : null}
            </div>

            {/* Buscador Centralizado */}
            <div className="mb-8 max-w-2xl mx-auto">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Search size={20} />
                    </span>
                    <input
                        type="text"
                        placeholder="Buscar fichas, plantillas, temas o palabras clave..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-400 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Filtros Nivel 1: Pestañas de Tipos de Contenido */}
            <div className="mb-6 border-b border-slate-200/80">
                <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-3 scrollbar-none">
                    {TYPES_FILTERS.map((type) => {
                        const isActive = selectedType === type;
                        return (
                            <button
                                key={type}
                                onClick={() => setSelectedType(type)}
                                className={`px-4 py-2.5 text-xs sm:text-sm font-extrabold tracking-tight transition-all shrink-0 cursor-pointer rounded-xl border ${
                                    isActive
                                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                                        : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                                {type}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Filtros Nivel 2: Badges Pill por Categorías Temáticas */}
            <div className="mb-10 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 shrink-0">Categoría:</span>
                {CATEGORIAS.map((category) => {
                    const isActive = selectedCategory === category;
                    return (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-3.5 py-1.5 rounded-full font-bold text-xs transition-all shrink-0 cursor-pointer border ${
                                isActive
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs"
                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800"
                            }`}
                        >
                            {category}
                        </button>
                    );
                })}
            </div>

            {/* Grid de Tarjetas */}
            {filteredRecursos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredRecursos.map((recurso) => (
                        <RecursoCard
                            key={recurso.id}
                            recurso={recurso}
                            showActions={showActions}
                            isPremiumUser={isPremiumUser}
                            onView={() => handleActionView(recurso)}
                            onDownload={() => handleActionDownload(recurso)}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm max-w-md mx-auto">
                    <BookOpen className="mx-auto text-slate-300 mb-4" size={48} />
                    <h3 className="font-bold text-slate-800 text-lg">No encontramos recursos</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                        Probá ajustar tu búsqueda o seleccionar otra categoría de recursos.
                    </p>
                </div>
            )}

            {/* Modal Paywall / Acceso Restringido */}
            {lockedResourceModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 relative overflow-hidden">
                        <button
                            onClick={() => setLockedResourceModal(null)}
                            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
                        >
                            <X size={20} />
                        </button>

                        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl flex items-center justify-center mb-5">
                            <Lock size={28} />
                        </div>

                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full">
                            Recurso Exclusivo Premium
                        </span>

                        <h3 className="text-2xl font-black text-slate-900 mt-3 mb-2">
                            {lockedResourceModal.title}
                        </h3>

                        <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">
                            {lockedResourceModal.description}
                        </p>

                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-6 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                                <span>Formato:</span>
                                <span className="text-slate-900">{lockedResourceModal.fileFormat || "PDF"}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                                <span>Páginas:</span>
                                <span className="text-slate-900">{lockedResourceModal.pages} {lockedResourceModal.pages === 1 ? "Hoja" : "Hojas"}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                                <span>Propietario:</span>
                                <span className="text-emerald-700 font-extrabold">{lockedResourceModal.author?.isOfficial || lockedResourceModal.author?.email === "nutringest@gmail.com" ? "Nutringest Official" : lockedResourceModal.author?.name || lockedResourceModal.author?.email || "Nutringest Official"}</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    setLockedResourceModal(null);
                                    router.push("/dashboard/campus/solicitar");
                                }}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-extrabold text-sm uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 cursor-pointer border-none flex items-center justify-center gap-2"
                            >
                                <span>Solicitar Acceso Estudiante / Pro</span>
                                <ArrowRight size={16} />
                            </button>

                            <button
                                onClick={() => setLockedResourceModal(null)}
                                className="w-full bg-white hover:bg-slate-50 text-slate-600 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer border border-slate-200"
                            >
                                Entendido, volver al catálogo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Publicación de Recursos (Solo ADMIN y SUPERADMIN) */}
            {isAdminOrSuperAdmin && (
                <CreateRecursoModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={handleResourceCreated}
                />
            )}

            {/* Modal de Checkout / Compra Individual (PAID) */}
            <RecursoCheckoutModal
                isOpen={Boolean(checkoutResource)}
                recurso={checkoutResource}
                onClose={() => setCheckoutResource(null)}
                onSuccessPurchase={handleSuccessPurchase}
            />
        </section>
    );
}

// ─── Componente Card de Recurso ──────────────────────────────────────────

interface RecursoCardProps {
    recurso: RecursoDidactico;
    showActions: boolean;
    isPremiumUser: boolean;
    onView: () => void;
    onDownload: () => void;
}

function RecursoCard({ recurso, showActions, isPremiumUser, onView, onDownload }: RecursoCardProps) {
    const isLocked = recurso.tier === "PREMIUM" && !isPremiumUser;

    const iconItem = recurso.iconId 
        ? CampusIconLibrary.getById(recurso.iconId) 
        : CampusIconLibrary.getByCategory(recurso.category);
    
    const IconComp = iconItem?.IconComponent;

    return (
        <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-300 group">
            <div>
                {/* Cabecera visual de la tarjeta con efecto 3D suave */}
                <div className="p-5 pb-0 flex items-center justify-center relative overflow-hidden h-44 bg-gradient-to-b from-slate-50 to-white">
                    <div className={`w-[85%] h-full rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-center relative overflow-hidden transition-all duration-300 group-hover:scale-105 bg-white`}>
                        {IconComp ? (
                            <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center bg-gradient-to-br transition-transform duration-300 group-hover:scale-110 shadow-xs ${iconItem.bgGradient} ${iconItem.borderClass}`}>
                                <IconComp className="w-8 h-8" />
                            </div>
                        ) : (
                            <span className="text-6xl select-none filter drop-shadow-sm transition-transform duration-300 group-hover:scale-110">
                                {recurso.icon}
                            </span>
                        )}

                        {/* Counter page badge */}
                        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-slate-200 text-slate-700 shadow-2xs">
                            {recurso.pages} {recurso.pages === 1 ? "Hoja" : "Hojas"}
                        </span>

                        {/* Status Tier Badge (GRATIS vs PREMIUM) */}
                        <span className={`absolute top-3 right-3 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-2xs ${
                            recurso.tier === "FREE"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-indigo-50 text-indigo-700 border-indigo-200"
                        }`}>
                            {recurso.tier === "PREMIUM" && <Lock size={10} className="text-indigo-600" />}
                            <span>{recurso.tier === "FREE" ? "GRATIS" : "PREMIUM"}</span>
                        </span>
                    </div>
                </div>

                {/* Contenido principal de la tarjeta */}
                <div className="p-5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">
                            {recurso.category}
                        </span>
                        {recurso.fileFormat && (
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                {recurso.fileFormat}
                            </span>
                        )}
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-emerald-600 transition-colors">
                        {recurso.title}
                    </h3>

                    <p className="text-xs font-medium text-slate-500 leading-relaxed line-clamp-2 min-h-[36px]">
                        {recurso.description}
                    </p>

                    {/* Propietario del recurso */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                        {recurso.author?.isOfficial || !recurso.author || recurso.author?.email === "nutringest@gmail.com" ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                                <ShieldCheck size={13} className="text-emerald-600" />
                                Oficial Nutringest
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                Creado por: {recurso.author.name || recurso.author.email}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Botones de Acción */}
            {showActions && (
                <div className="p-5 pt-0 space-y-2">
                    <button
                        onClick={onView}
                        className={`w-full py-2.5 font-extrabold uppercase text-[11px] tracking-wider rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            isLocked
                                ? "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                : "bg-slate-900 hover:bg-slate-800 text-white border-slate-900 shadow-xs"
                        }`}
                    >
                        {isLocked ? (
                            <>
                                <Lock size={14} className="text-indigo-600" />
                                <span>Ver Previa (Premium)</span>
                            </>
                        ) : (
                            <>
                                <Eye size={14} className="stroke-[2.5]" />
                                <span>Ver Ficha Online</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={onDownload}
                        className={`w-full py-2.5 font-extrabold uppercase text-[11px] tracking-wider rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            isLocked
                                ? "bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-50"
                                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200"
                        }`}
                    >
                        <Download size={14} className="stroke-[2.5]" />
                        <span>Exportar PDF</span>
                    </button>
                </div>
            )}
        </div>
    );
}

