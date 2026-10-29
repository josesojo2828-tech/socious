import { useForm } from "react-hook-form";
import { useTranslation } from "@/context/i18n.context";

export interface PaypalData {
    email: string;
    isDefault: boolean;
}

export const PaypalForm = ({ onSubmit }: { onSubmit: (data: PaypalData) => void }) => {
    const { t } = useTranslation();
    const { register, handleSubmit, formState: { errors } } = useForm<PaypalData>();

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-info/10 border-l-4 border-info p-4 mb-4 rounded-r-lg">
                <p className="text-sm text-info font-medium">
                    {t('form.payment.paypal.info')}
                </p>
            </div>

            {/* Correo */}
            <div>
                <label className="block text-sm font-medium text-base-content/80 mb-1">{t('form.payment.paypal.email_label')}</label>
                <input
                    type="email"
                    {...register("email", {
                        required: t('form.validation_errors.required'),
                        pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: t('form.validation_errors.email_invalid')
                        }
                    })}
                    className="input input-bordered w-full"
                    placeholder={t('form.payment.paypal.email_placeholder')}
                />
                {errors.email && <span className="text-xs text-error">{errors.email.message}</span>}
            </div>

            <div className="flex items-center gap-2 pt-2">
                <label htmlFor="binanceDefault" className="text-sm text-base-content/80">{t('form.payment.common.validation_usage')}</label>
            </div>

            <button
                type="submit"
                className="btn btn-primary w-full"
            >
                {t('form.payment.paypal.submit')}
            </button>
        </form>
    );
};