"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { Button } from "@/shared/components/atoms/Button";

export default function ChangePasswordPage() {
    const router = useRouter();
    const { user, isAuthenticated, changePassword } = useAuthStore();

    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<{
        oldPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
    }>({});

    useEffect(() => {
        if (!isAuthenticated) {
            router.replace("/login");
        } else if (user && !user.mustChangePassword) {
            router.replace("/dashboard");
        }
    }, [isAuthenticated, user, router]);

    const validate = (): boolean => {
        const errors: typeof fieldErrors = {};

        if (!oldPassword) {
            errors.oldPassword = "La contraseña actual es requerida";
        }

        if (!newPassword) {
            errors.newPassword = "La nueva contraseña es requerida";
        } else if (newPassword.length < 8) {
            errors.newPassword = "Mínimo 8 caracteres";
        }

        if (!confirmPassword) {
            errors.confirmPassword = "Confirma la nueva contraseña";
        } else if (newPassword !== confirmPassword) {
            errors.confirmPassword = "Las contraseñas no coinciden";
        }

        if (oldPassword && newPassword && oldPassword === newPassword) {
            errors.newPassword = "La nueva contraseña debe ser diferente";
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsLoading(true);
        setError(null);

        try {
            await changePassword(oldPassword, newPassword);
            router.push("/dashboard");
        } catch (err: unknown) {
            const responseMessage = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
            const message =
                (Array.isArray(responseMessage) ? responseMessage[0] : responseMessage) as string ||
                (err instanceof Error ? err.message : null) ||
                "Error al cambiar la contraseña";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="flex min-h-screen w-full bg-slate-50 font-sans items-center justify-center p-8">
            <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mx-auto">
                        <ShieldCheck className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">
                        Cambia tu contraseña
                    </h1>
                    <p className="text-slate-500 font-medium">
                        Por seguridad, debes actualizar tu contraseña antes de continuar.
                    </p>
                </div>

                {error && (
                    <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-bold animate-in shake duration-300">
                        {error}
                    </div>
                )}

                <form className="space-y-5" onSubmit={handleSubmit}>
                    {/* Current Password */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
                            Contraseña actual
                        </label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
                            <input
                                type={showOld ? "text" : "password"}
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                disabled={isLoading}
                                placeholder="••••••••"
                                className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none text-slate-700 font-medium disabled:opacity-50"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowOld(!showOld)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                            >
                                {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {fieldErrors.oldPassword && (
                            <p className="text-red-500 text-xs font-bold ml-1">{fieldErrors.oldPassword}</p>
                        )}
                    </div>

                    {/* New Password */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
                            Nueva contraseña
                        </label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
                            <input
                                type={showNew ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={isLoading}
                                placeholder="••••••••"
                                className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none text-slate-700 font-medium disabled:opacity-50"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                            >
                                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {fieldErrors.newPassword && (
                            <p className="text-red-500 text-xs font-bold ml-1">{fieldErrors.newPassword}</p>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
                            Confirmar contraseña
                        </label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
                            <input
                                type={showConfirm ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={isLoading}
                                placeholder="••••••••"
                                className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none text-slate-700 font-medium disabled:opacity-50"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                            >
                                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {fieldErrors.confirmPassword && (
                            <p className="text-red-500 text-xs font-bold ml-1">{fieldErrors.confirmPassword}</p>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="pt-2">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-base shadow-lg shadow-emerald-600/10 hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group border-none"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Actualizando...
                                </>
                            ) : (
                                <>
                                    Actualizar contraseña
                                    <ShieldCheck size={18} className="group-hover:scale-110 transition-transform" />
                                </>
                            )}
                        </Button>
                    </div>
                </form>

                <div className="text-center">
                    <Link
                        href="/login"
                        className="text-sm text-slate-400 hover:text-slate-600 font-bold transition-colors"
                    >
                        Volver al login
                    </Link>
                </div>
            </div>
        </main>
    );
}
