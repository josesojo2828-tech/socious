"use client";

import React, { useEffect, useState } from "react";
import { X, UserPlus, Loader2, Mail } from "lucide-react";
import { PatientReferralService } from "@/features/nutringest/patient-referral/services/patient-referral.service";
import type { CollaboratorSearchResult } from "@/types/nutringest/patient-referral.interface";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useTranslation } from "@/context/i18n.context";

interface Props {
    isOpen: boolean;
    patientId: string;
    onClose: () => void;
    onSuccess: () => void;
}

const DEBOUNCE_MS = 400;
const MIN_EMAIL_CHARS = 3;
const MAX_MESSAGE_LENGTH = 500;

export const AddCollaboratorModal = ({ isOpen, patientId, onClose, onSuccess }: Props) => {
    const { t } = useTranslation();
    const { addToast } = useToastStore();

    const [email, setEmail] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<CollaboratorSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    // Reset del formulario al abrir el modal.
    useEffect(() => {
        if (!isOpen) return;
        setEmail("");
        setSelectedId(null);
        setSuggestions([]);
        setIsSearching(false);
        setHasSearched(false);
        setMessage("");
    }, [isOpen]);

    // Búsqueda con debounce: solo consulta con >= 3 caracteres y si no se seleccionó una sugerencia.
    useEffect(() => {
        if (!isOpen) return;
        const q = email.trim();
        if (q.length < MIN_EMAIL_CHARS || selectedId) {
            setSuggestions([]);
            setIsSearching(false);
            setHasSearched(false);
            return;
        }
        setIsSearching(true);
        const timer = setTimeout(async () => {
            try {
                const res = await PatientReferralService.searchCollaborators(q);
                setSuggestions(res.data ?? []);
            } catch {
                setSuggestions([]);
            } finally {
                setIsSearching(false);
                setHasSearched(true);
            }
        }, DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [email, isOpen, selectedId]);

    const handleEmailChange = (value: string) => {
        setEmail(value);
        if (selectedId) setSelectedId(null);
    };

    const handleSelectSuggestion = (s: CollaboratorSearchResult) => {
        setEmail(s.email);
        setSelectedId(s.id);
        setSuggestions([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const targetEmail = email.trim();
        if (!targetEmail || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await PatientReferralService.inviteCollaborator(patientId, {
                email: targetEmail,
                message: message.trim() || undefined,
            });
            addToast({
                type: "success",
                title: "Invitación enviada",
                message: t("dashboard.patients.detail.team.inviteSuccess"),
            });
            setMessage("");
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Error al invitar colaborador:", err);
            const status = err.response?.status;
            let errorMessage = err.response?.data?.message;
            if (status === 403) {
                errorMessage = t("dashboard.patients.detail.team.errors.notPremium");
            } else if (status === 404) {
                errorMessage = t("dashboard.patients.detail.team.errors.emailNotFound");
            } else if (status === 409) {
                errorMessage = t("dashboard.patients.detail.team.errors.alreadyMember");
            } else if (!errorMessage) {
                errorMessage = t("dashboard.patients.detail.team.errors.generic");
            }
            addToast({
                type: "error",
                title: "Error",
                message: errorMessage,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const showSuggestions = email.trim().length >= MIN_EMAIL_CHARS && (isSearching || suggestions.length > 0 || hasSearched);

    return (
        <div>
            <div className="px-6 py-4 border-b border-base-200 flex justify-between items-center bg-base-200/50">
                <h3 className="font-bold text-base-content flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                        <UserPlus size={18} />
                    </div>
                    Agregar colaborador
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-base-300 rounded-full text-base-content/50 transition-colors">
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
                {/* Invitación por email */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-base-content/60 uppercase">
                        Correo del nutricionista
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-2.5 text-base-content/50" size={16} />
                        <input
                            type="email"
                            placeholder={t("dashboard.patients.detail.team.invitePlaceholder")}
                            className="w-full pl-9 pr-3 py-2 bg-base-200 border border-base-300 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                            value={email}
                            onChange={(e) => handleEmailChange(e.target.value)}
                        />
                    </div>

                    {showSuggestions && (
                        <div className="border border-base-300 rounded-xl max-h-52 overflow-y-auto bg-base-100 mt-2">
                            {isSearching ? (
                                <div className="p-4 text-center text-xs text-base-content/50 flex items-center justify-center gap-2">
                                    <Loader2 size={14} className="animate-spin" />{" "}
                                    {t("dashboard.patients.detail.team.inviteSearching")}
                                </div>
                            ) : suggestions.length === 0 ? (
                                <div className="p-4 text-center text-xs text-base-content/50">
                                    {t("dashboard.patients.detail.team.inviteNoResults")}
                                </div>
                            ) : (
                                suggestions.map((s) => (
                                    <div
                                        key={s.id}
                                        onClick={() => handleSelectSuggestion(s)}
                                        className={`px-4 py-2.5 text-sm cursor-pointer border-b border-base-200 last:border-0 transition-colors ${
                                            selectedId === s.id
                                                ? "bg-emerald-50 text-emerald-700"
                                                : "hover:bg-base-200 text-base-content/90"
                                        }`}
                                    >
                                        <p className="font-medium truncate">{s.fullName}</p>
                                        <p className="flex items-center gap-1 text-xs text-base-content/50 min-w-0">
                                            <Mail size={11} /> <span className="truncate">{s.email}</span>
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    <p className="text-[11px] text-amber-600">
                        {t("dashboard.patients.detail.team.inviteHint")}
                    </p>
                </div>

                {/* Mensaje opcional */}
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-base-content/60 uppercase">
                        Mensaje <span className="font-normal normal-case">(opcional)</span>
                    </label>
                    <textarea
                        rows={3}
                        maxLength={MAX_MESSAGE_LENGTH}
                        placeholder="Contale al nutricionista por qué se suma al equipo..."
                        className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-xl text-sm outline-none focus:border-emerald-500 resize-none"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                    <p className="text-[10px] text-base-content/50 text-right">
                        {message.length}/{MAX_MESSAGE_LENGTH}
                    </p>
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
                        disabled={!email.trim() || isSubmitting}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={14} className="animate-spin" /> Enviando invitación...
                            </>
                        ) : (
                            <>
                                <UserPlus size={14} /> Enviar invitación
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};
