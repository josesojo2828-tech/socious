"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Search, Send, Stethoscope, Loader2, Mail } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { DashboardEndpoints } from "@/features/dashboard/service/dashboard.endpoints";
import { PatientReferralService } from "@/features/nutringest/patient-referral/services/patient-referral.service";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { useToastStore } from "@/shared/store/ui/useToastStore";

interface Props {
    isOpen: boolean;
    patientId: string;
    excludeNutritionistIds?: string[];
    onClose: () => void;
    onSuccess: () => void;
}

interface NutritionistOption {
    id: string; // nutritionist profile id -> toNutritionistId
    name: string;
    email?: string;
    licenseCode?: string | null;
    specialty?: string | null;
}

export const ReferPatientModal = ({ isOpen, patientId, excludeNutritionistIds, onClose, onSuccess }: Props) => {
    const currentUser = useAuthStore((state) => state.user);
    const { addToast } = useToastStore();

    const myNutritionistId = currentUser?.nutritionistProfile?.id ?? null;

    const [isSearching, setIsSearching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [nutritionists, setNutritionists] = useState<NutritionistOption[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedId, setSelectedId] = useState<string>("");
    const [message, setMessage] = useState("");

    const excludeRef = useRef(excludeNutritionistIds);
    useEffect(() => {
        excludeRef.current = excludeNutritionistIds;
    }, [excludeNutritionistIds]);

    // Carga la lista de nutricionistas desde el endpoint de usuarios paginado del dashboard
    // (misma fuente que usa el dropdown de ActivityDashboard). El backend incluye
    // nutritionistProfile.via DEFAULT_INCLUDE; filtramos client-side a los que tienen
    // perfil de nutricionista y descartamos al usuario actual y a los miembros activos.
    useEffect(() => {
        if (!isOpen) return;
        setIsSearching(true);
        setNutritionists([]);
        setSelectedId("");
        setSearchTerm("");

        apiClient
            .get(DashboardEndpoints.api.users, { params: { page: 1, limit: 100 } })
            .then((res) => {
                const list = res.data?.list || [];
                const excludes = new Set(excludeRef.current ?? []);
                if (myNutritionistId) excludes.add(myNutritionistId);

                const options: NutritionistOption[] = list
                    .filter((user: any) => !!user.nutritionistProfile?.id)
                    .map((user: any) => {
                        const fullName =
                            user.fullName ||
                            `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                            user.email ||
                            user.id;
                        return {
                            id: user.nutritionistProfile.id,
                            name: fullName,
                            email: user.email,
                            licenseCode: user.nutritionistProfile.licenseCode,
                            specialty: user.nutritionistProfile.specialty,
                        };
                    })
                    .filter((n: NutritionistOption) => !excludes.has(n.id));

                setNutritionists(options);
            })
            .catch((err: any) => {
                console.error("Error cargando nutricionistas:", err);
                addToast({
                    type: "error",
                    title: "Error",
                    message: err.response?.data?.message || "No se pudieron cargar los nutricionistas disponibles.",
                });
            })
            .finally(() => setIsSearching(false));
    }, [isOpen, myNutritionistId, addToast]);

    const filteredNutritionists = nutritionists.filter((n) => {
        const q = searchTerm.toLowerCase();
        return (
            n.name.toLowerCase().includes(q) ||
            (n.email || "").toLowerCase().includes(q) ||
            (n.licenseCode || "").toLowerCase().includes(q)
        );
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedId) return;

        setIsSubmitting(true);
        try {
            const response = await PatientReferralService.create({
                patientId,
                toNutritionistId: selectedId,
                message: message.trim() || undefined,
            });
            addToast({
                type: "success",
                title: "Referido",
                message: response?.data?.message || "Referido enviado correctamente.",
            });
            setMessage("");
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Error al referir paciente:", err);
            addToast({
                type: "error",
                title: "Error",
                message: err.response?.data?.message || "No se pudo enviar el referido.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div>
            <div className="px-6 py-4 border-b border-base-200 flex justify-between items-center bg-base-200/50">
                <h3 className="font-bold text-base-content flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                        <Stethoscope size={18} />
                    </div>
                    Referir paciente
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-base-300 rounded-full text-base-content/50 transition-colors">
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
                {/* Picker de nutricionista */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-base-content/60 uppercase">
                        Nutricionista destino
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-base-content/50" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, email o matrícula..."
                            className="w-full pl-9 pr-3 py-2 bg-base-200 border border-base-300 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="border border-base-300 rounded-xl max-h-52 overflow-y-auto bg-base-100 mt-2">
                        {isSearching ? (
                            <div className="p-4 text-center text-xs text-base-content/50 flex items-center justify-center gap-2">
                                <Loader2 size={14} className="animate-spin" /> Cargando nutricionistas...
                            </div>
                        ) : filteredNutritionists.length === 0 ? (
                            <div className="p-4 text-center text-xs text-base-content/50">
                                {nutritionists.length === 0
                                    ? "No hay nutricionistas disponibles para referir."
                                    : "Sin resultados para la búsqueda."}
                            </div>
                        ) : (
                            filteredNutritionists.map((n) => (
                                <div
                                    key={n.id}
                                    onClick={() => setSelectedId(n.id)}
                                    className={`px-4 py-2.5 text-sm cursor-pointer border-b border-base-200 last:border-0 flex items-center justify-between gap-3 transition-colors ${
                                        selectedId === n.id
                                            ? "bg-emerald-50 text-emerald-700"
                                            : "hover:bg-base-200 text-base-content/90"
                                    }`}
                                >
                                    <div className="min-w-0">
                                        <p className="font-medium truncate">{n.name}</p>
                                        <div className="flex items-center gap-2 text-xs text-base-content/50">
                                            {n.email && (
                                                <span className="flex items-center gap-1 min-w-0">
                                                    <Mail size={11} /> <span className="truncate">{n.email}</span>
                                                </span>
                                            )}
                                            {n.licenseCode && <span>MP {n.licenseCode}</span>}
                                        </div>
                                    </div>
                                    <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                            selectedId === n.id
                                                ? "bg-emerald-600 text-white"
                                                : "bg-base-200 text-base-content/60"
                                        }`}
                                    >
                                        {selectedId === n.id ? "Seleccionado" : "Elegir"}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Mensaje opcional */}
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-base-content/60 uppercase">
                        Mensaje <span className="font-normal normal-case">(opcional)</span>
                    </label>
                    <textarea
                        rows={3}
                        placeholder="Contale al nutricionista por qué referís este paciente..."
                        className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-xl text-sm outline-none focus:border-emerald-500 resize-none"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-base-300 rounded-lg text-sm font-medium hover:bg-base-200"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={!selectedId || isSubmitting}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={14} className="animate-spin" /> Enviando...
                            </>
                        ) : (
                            <>
                                <Send size={14} /> Referir paciente
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};