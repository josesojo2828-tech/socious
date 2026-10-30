'use client';

import { useTranslation } from "@/context/i18n.context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { MessageSquare, Send, Bug, Lightbulb, HelpCircle, Mail, User } from "lucide-react";
import { useState } from "react";
import { PublicFooter, PublicHeader } from "@/shared/components/molecules/PublicShell";

// Schema de validación
const feedbackSchema = z.object({
    name: z.string().optional(),
    email: z.string().email("Por favor ingresa un email válido"),
    type: z.enum(["feature", "bug", "general"]),
    subject: z.string().min(5, "El asunto debe tener al menos 5 caracteres"),
    description: z.string().min(20, "La descripción debe tener al menos 20 caracteres"),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

export default function FeedbackPage() {
    const { t } = useTranslation(); // Aunque el contenido principal lo haré en español directo por ahora para agilidad, mantenemos el hook por si acaso
    const { addToast } = useToastStore();
    const [isSubmitted, setIsSubmitted] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FeedbackFormData>({
        resolver: zodResolver(feedbackSchema),
        defaultValues: {
            type: "feature"
        }
    });

    const selectedType = watch("type");

    const onSubmit = async (data: FeedbackFormData) => {
        // Simulación de envío a backend
        await new Promise(resolve => setTimeout(resolve, 1500));

        console.log("Feedback enviado:", data);

        addToast({
            type: 'success',
            title: t('landing.feedback.success.toast_title'),
            message: t('landing.feedback.success.toast_message'),
        });

        setIsSubmitted(true);
        reset();
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'feature': return <Lightbulb className="w-5 h-5 text-yellow-500" />;
            case 'bug': return <Bug className="w-5 h-5 text-red-500" />;
            default: return <MessageSquare className="w-5 h-5 text-emerald-500" />;
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-base-200">
            <PublicHeader />

            <main className="grow pt-28 pb-16 px-4">
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center p-3 bg-base-100 rounded-2xl shadow-sm border border-base-300 mb-4">
                            <MessageSquare className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-base-content mb-4">
                            {t('landing.feedback.header.title')}
                        </h1>
                        <p className="text-lg text-base-content/60 max-w-lg mx-auto">
                            {t('landing.feedback.header.desc')}
                        </p>
                    </div>

                    <div className="bg-base-100 rounded-3xl shadow-xl border border-base-300 overflow-hidden">
                        {isSubmitted ? (
                            <div className="p-12 text-center space-y-6 animate-fade-in">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                                    <Send size={40} />
                                </div>
                                <h3 className="text-2xl font-bold text-base-content">{t('landing.feedback.success.title')}</h3>
                                <p className="text-base-content/60">
                                    {t('landing.feedback.success.message')}
                                </p>
                                <button
                                    onClick={() => setIsSubmitted(false)}
                                    className="btn btn-outline border-base-300 hover:bg-base-200 text-base-content/60"
                                >
                                    {t('landing.feedback.success.btn_another')}
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-10 space-y-6">

                                {/* Tipo de Feedback */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        { id: 'feature', label: t('landing.feedback.form.types.feature'), icon: <Lightbulb size={18} /> },
                                        { id: 'bug', label: t('landing.feedback.form.types.bug'), icon: <Bug size={18} /> },
                                        { id: 'general', label: t('landing.feedback.form.types.general'), icon: <HelpCircle size={18} /> }
                                    ].map((type) => (
                                        <label
                                            key={type.id}
                                            className={`
                                                cursor-pointer flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all
                                                ${selectedType === type.id
                                                    ? 'border-primary bg-primary/5 text-primary'
                                                    : 'border-base-300 hover:border-base-content/20 text-base-content/60 hover:bg-base-200'}
                                            `}
                                        >
                                            <input
                                                type="radio"
                                                value={type.id}
                                                {...register('type')}
                                                className="hidden"
                                            />
                                            <div className="mb-2">{type.icon}</div>
                                            <span className="font-semibold text-sm">{type.label}</span>
                                        </label>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="form-control w-full">
                                        <label className="label pt-0"><span className="label-text font-medium text-base-content/80">{t('landing.feedback.form.labels.name')}</span></label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-base-content/60">
                                                <User size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                {...register('name')}
                                                className="input input-bordered w-full pl-10 bg-base-100 border-base-300 text-base-content placeholder-base-content/40 focus:bg-base-100 transition-colors"
                                                placeholder={t('landing.feedback.form.placeholders.name')}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-control w-full">
                                        <label className="label pt-0"><span className="label-text font-medium text-base-content/80">{t('landing.feedback.form.labels.email')}</span></label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-base-content/60">
                                                <Mail size={18} />
                                            </div>
                                            <input
                                                type="email"
                                                {...register('email')}
                                                className={`input input-bordered w-full pl-10 bg-base-100 border-base-300 text-base-content placeholder-base-content/40 focus:bg-base-100 transition-colors ${errors.email ? 'input-error' : ''}`}
                                                placeholder={t('landing.feedback.form.placeholders.email')}
                                            />
                                        </div>
                                        {/* Validation messages hardcoded in schema, strictly speaking should be in schema definition but it is outside component scope unless memoized/effect.
                                            For now the schema has hardcoded Spanish strings, which is fine as this is a Spanish app primarily.
                                            Ideally schema uses i18n too but that requires moving schema inside component or passing t to it.
                                            I'll leave schema strings as Spanish hardcoded for now as I can't easily inject t() into Zod schema defined outside component.
                                        */}
                                        {errors.email && <span className="text-error text-xs mt-1">{errors.email.message}</span>}
                                    </div>
                                </div>

                                <div className="form-control w-full">
                                    <label className="label pt-0"><span className="label-text font-medium text-base-content/80">{t('landing.feedback.form.labels.subject')}</span></label>
                                    <input
                                        type="text"
                                        {...register('subject')}
                                        className={`input input-bordered w-full bg-base-100 border-base-300 text-base-content placeholder-base-content/40 focus:bg-base-100 transition-colors ${errors.subject ? 'input-error' : ''}`}
                                        placeholder={selectedType === 'feature' ? t('landing.feedback.form.placeholders.subject_feature') : t('landing.feedback.form.placeholders.subject_bug')}
                                    />
                                    {errors.subject && <span className="text-error text-xs mt-1">{errors.subject.message}</span>}
                                </div>

                                <div className="form-control w-full">
                                    <label className="label pt-0"><span className="label-text font-medium text-base-content/80">{t('landing.feedback.form.labels.desc')}</span></label>
                                    <textarea
                                        {...register('description')}
                                        className={`textarea textarea-bordered h-32 w-full bg-base-100 border-base-300 text-base-content placeholder-base-content/40 focus:bg-base-100 transition-colors text-base ${errors.description ? 'textarea-error' : ''}`}
                                        placeholder={t('landing.feedback.form.placeholders.desc')}
                                    ></textarea>
                                    {errors.description && <span className="text-error text-xs mt-1">{errors.description.message}</span>}
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        className="btn btn-primary w-full h-12 text-lg shadow-lg shadow-primary/30"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <span className="loading loading-spinner"></span>
                                        ) : (
                                            <>
                                                {t('landing.feedback.form.submit')} <Send size={20} className="ml-2" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    );
}
