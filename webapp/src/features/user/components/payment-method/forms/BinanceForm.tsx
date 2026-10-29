import { useForm } from "react-hook-form";
import { useTranslation } from "@/context/i18n.context";

export interface BinanceData {
    email: string;
    username: string;
    isDefault: boolean;
}

export const BinanceForm = ({ onSubmit }: { onSubmit: (data: BinanceData) => void }) => {
    const { t } = useTranslation();
    const { register, handleSubmit, formState: { errors } } = useForm<BinanceData>();

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-warning/10 border-l-4 border-warning p-4 mb-4 rounded-r-lg">
                <p className="text-sm text-warning font-medium">
                    {t('form.payment.binance.info')}
                </p>
            </div>

            {/* Correo */}
            <div>
                <label className="block text-sm font-medium text-base-content/80 mb-1">{t('form.payment.binance.email_label')}</label>
                <input
                    type="email"
                    {...register("email", { required: t('form.validation_errors.required') })}
                    className="input input-bordered w-full"
                    placeholder={t('form.payment.binance.email_placeholder')}
                />
                {errors.email && <span className="text-xs text-error">{errors.email.message}</span>}
            </div>

            {/* Usuario */}
            <div>
                <label className="block text-sm font-medium text-base-content/80 mb-1">{t('form.payment.binance.username_label')}</label>
                <input
                    type="text"
                    {...register("username", { required: t('form.validation_errors.required') })}
                    className="input input-bordered w-full"
                    placeholder={t('form.payment.binance.username_placeholder')}
                />
                {errors.username && <span className="text-xs text-error">{errors.username.message}</span>}
            </div>

            <div className="flex items-center gap-2 pt-2">
                <label htmlFor="binanceDefault" className="text-sm text-base-content/80">{t('form.payment.common.validation_usage')}</label>
            </div>

            <button
                type="submit"
                className="btn btn-warning w-full"
            >
                {t('form.payment.binance.submit')}
            </button>
        </form>
    );
};

