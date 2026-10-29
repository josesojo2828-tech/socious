"use client"; // Importante para Next.js App Router

import { useState } from "react";
import { useRouter } from "next/navigation"; // Router
import { Layers, Lock, Mail, Loader2 } from "lucide-react";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";

import { useTranslation } from "@/context/i18n.context";
import { useModalStore } from "@/shared/store/ui/useModalStore";

export const FormLogin = ({ onBack }: any) => {
    const router = useRouter();
    const { t } = useTranslation();

    const { closeModal } = useModalStore();
    const [email, setEmail] = useState("superadmin@example.com");
    const [password, setPassword] = useState("123456");

    const { login, isLoading, error } = useAuthStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;

        try {
            await login(email, password);
            router.push("/dashboard"); // O a tu dashboard principal
        } catch (err) {
            console.error("Login fallido");
        } finally {
            closeModal();
        }
    };

    return (
        <div className="max-w-full">
            <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30 transform rotate-3">
                    <Layers size={24} className="text-primary-content" />
                </div>
                <h2 className="text-2xl font-bold text-base-content">{t('auth.welcome_back')}</h2>
                <p className="text-base-content/60 mt-2">{t('auth.enter_credentials')}</p>
            </div>

            {/* Mensaje de Error Visual */}
            {error && (
                <div className="mb-4 p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm text-center font-medium">
                    {error}
                </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                    <label className="block text-sm font-bold text-base-content/80 mb-2 ml-1">{t('form.labels.email')}</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-base-content/40">
                            <Mail size={20} />
                        </div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                            className="input-field w-full pl-11 pr-5 py-3 rounded-2xl bg-base-200 border-2 border-transparent focus:bg-white outline-none transition-all text-base-content placeholder:text-base-content/30 disabled:opacity-50"
                            placeholder={t('form.placeholders.email')}
                        />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2 ml-1">
                        <label className="block text-sm font-bold text-base-content/80">{t('form.labels.password')}</label>
                        <a href="#" className="text-sm text-primary font-medium hover:underline">{t('common.auth.forgot_password')}</a>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-base-content/40">
                            <Lock size={20} />
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            className="input-field w-full pl-11 pr-5 py-3 rounded-2xl bg-base-200 border-2 border-transparent focus:bg-white outline-none transition-all text-base-content placeholder:text-base-content/30 disabled:opacity-50"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="btn btn-primary w-full shadow-lg shadow-primary/30 text-lg mt-4 disabled:bg-primary/70"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            {t('auth.login_loading')}
                        </>
                    ) : (
                        t('form.buttons.login')
                    )}
                </button>
            </form>

            <div className="mt-8 pt-6 border-t border-base-content/5 text-center">
                <p className="text-sm text-base-content/60">
                    {t('auth.no_account')} <a href="#" className="text-primary font-bold hover:underline">{t('auth.register_link')}</a>
                </p>
            </div>
        </div>
    );
};