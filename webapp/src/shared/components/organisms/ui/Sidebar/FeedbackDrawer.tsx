"use client";

import { X, Bug, Puzzle, Send, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/atoms/Button";
import { Text } from "@/shared/components/atoms/Text";
import { useState } from "react";
import { useTranslation } from "@/context/i18n.context";
import { useFeedback } from "@/features/user/hooks/useFeedback";

interface FeedbackDrawerProps {
    children: React.ReactNode;
}

export const FeedbackDrawer = ({ children }: FeedbackDrawerProps) => {
    const [activeTab, setActiveTab] = useState<'bug' | 'integration'>('bug');
    const { t } = useTranslation();

    const { sendFeedback, loading, error, success, setDescription, setTitle, title, description } = useFeedback();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        await sendFeedback({
            title: formData.get("title") as string,
            description: formData.get("description") as string,
            type: activeTab,
        });
    };

    return (
        <div className="drawer drawer-end">
            <input id="feedback-drawer" type="checkbox" className="drawer-toggle" />

            <div className="drawer-content flex flex-col">
                {/* Aquí renderiza el resto del dashboard (Sidebar + Content) */}
                {children}
            </div>

            <div className="drawer-side z-[9999] print:hidden">
                <label htmlFor="feedback-drawer" aria-label="close sidebar" className="drawer-overlay bg-black/50 backdrop-blur-xs"></label>

                <div className="menu p-0 w-80 md:w-96 min-h-full bg-base-100 text-base-content shadow-2xl">
                    {/* Header del Drawer */}
                    <div className="p-6 border-b border-base-300 flex justify-between items-center bg-base-200/50">
                        <div>
                            <Text as="h2" className="text-xl font-black text-base-content">{t('common.feedback_drawer.title')}</Text>
                            <Text as="p" variant="muted" className="text-xs">{t('common.feedback_drawer.subtitle')}</Text>
                        </div>
                        <label htmlFor="feedback-drawer" className="btn btn-ghost btn-sm btn-circle">
                            <X size={20} />
                        </label>
                    </div>

                    {/* Selector de tipo (Tabs) */}
                    <div className="p-6">
                        <div className="grid grid-cols-2 gap-2 bg-base-200 p-1 rounded-xl mb-6">
                            <button
                                onClick={() => setActiveTab('bug')}
                                className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'bug' ? 'bg-base-100 shadow-sm text-primary' : 'text-base-content/60 hover:text-base-content'}`}
                            >
                                <Bug size={14} /> {t('common.feedback_drawer.bug_tab')}
                            </button>
                            <button
                                onClick={() => setActiveTab('integration')}
                                className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'integration' ? 'bg-base-100 shadow-sm text-primary' : 'text-base-content/60 hover:text-base-content'}`}
                            >
                                <Puzzle size={14} /> {t('common.feedback_drawer.integration_tab')}
                            </button>
                        </div>

                        {/* Formulario Dinámico */}
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div>
                                <label className="label text-xs font-bold uppercase tracking-wider text-base-content/60">{t('common.feedback_drawer.title_label')}</label>
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    type="text"
                                    placeholder={activeTab === 'bug' ? t('common.feedback_drawer.bug_placeholder') : t('common.feedback_drawer.integration_placeholder')}
                                    className="input input-bordered w-full bg-base-200 focus:bg-base-100 transition-all rounded-xl border-base-300 focus:border-primary"
                                />
                            </div>

                            <div>
                                <label className="label text-xs font-bold uppercase tracking-wider text-base-content/60">{t('common.feedback_drawer.description_label')}</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="textarea textarea-bordered w-full bg-base-200 focus:bg-base-100 transition-all rounded-xl border-base-300 focus:border-primary h-32"
                                    placeholder={t('common.feedback_drawer.description_placeholder')}
                                ></textarea>
                            </div>

                            {activeTab === 'bug' && (
                                <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                    <Text className="text-[10px] text-amber-600 dark:text-amber-400 leading-tight">
                                        {t('common.feedback_drawer.bug_note')}
                                    </Text>
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={loading || success}
                                variant="primary"
                                className="w-full py-7 bg-primary text-primary-content rounded-xl font-bold shadow-xl"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        {t('common.feedback_drawer.submitting')}
                                    </>
                                ) : (
                                    t('common.feedback_drawer.submit')
                                )}
                            </Button>
                        </form>
                    </div>

                    {/* Footer del Drawer */}
                    <div className="mt-auto p-6 bg-base-200 border-t border-base-300">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2 rounded-lg text-primary">
                                <MessageSquare size={20} />
                            </div>
                            <div>
                                <Text className="text-sm font-bold">{t('common.feedback_drawer.footer_title')}</Text>
                                <Text className="text-xs text-base-content/60 underline cursor-pointer">{t('common.feedback_drawer.footer_link')}</Text>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};