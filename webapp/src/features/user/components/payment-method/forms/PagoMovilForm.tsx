"use client";

import { useTranslation } from "@/context/i18n.context";
import { useState } from "react";
import { useForm } from "react-hook-form";

export interface PagoMovilData {
    bank: string;
    identity: string;
    phone: string;
    isDefault: boolean;
}

const VENEZUELA_BANKS = [
    "Banco de Venezuela",
    "Banesco",
    "Banco Mercantil",
    "BBVA Provincial",
    "BNC",
    "Bancamiga",
    "Bancaribe",
    "Banco Venezolano de Crédito (BVC)",
    "BFC Banco Fondo Común",
    "Banco del Tesoro",
    "Banfanb",
    "Banco Bicentenario",
    "Banplus",
    "Banco Plaza",
    "Banco Exterior",
    "Banco Caroní",
    "Banco Activo",
    "Banco Sofitasa",
    "100% Banco",
    "Banco del Sur",
    "Mi Banco",
    "Otro"
];

export const PagoMovilForm = ({ onSubmit }: { onSubmit: (data: PagoMovilData) => void }) => {
    const { t } = useTranslation();
    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<PagoMovilData>();
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Observamos el valor actual del input de banco para filtrar
    const bankValue = watch("bank");

    // Filtramos la lista de bancos basado en lo que el usuario escribe
    const filteredBanks = VENEZUELA_BANKS.filter(bank =>
        bank.toLowerCase().includes((bankValue || "").toLowerCase())
    );

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-success/10 border-l-4 border-success p-4 mb-4 rounded-r-lg">
                <p className="text-sm text-success font-medium">
                    {t('form.payment.pago_movil.info')}
                </p>
            </div>

            {/* Banco con Autocomplete */}
            <div className="relative">
                <label className="block text-sm font-medium text-base-content/80 mb-1">{t('form.payment.pago_movil.bank_label')}</label>
                <input
                    type="text"
                    autoComplete="off" // Desactivamos el autocomplete del navegador para usar el nuestro
                    {...register("bank", { required: t('form.payment.pago_movil.validation.bank_required') })}
                    onFocus={() => setShowSuggestions(true)}
                    // Usamos timeout para dar tiempo al click en la lista antes de cerrar
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="input input-bordered w-full"
                    placeholder={t('form.payment.pago_movil.bank_placeholder')}
                />

                {/* Lista de Sugerencias */}
                {showSuggestions && filteredBanks.length > 0 && (
                    <ul className="absolute z-10 w-full bg-base-100 border border-base-300 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg">
                        {filteredBanks.map((bank) => (
                            <li
                                key={bank}
                                onClick={() => {
                                    setValue("bank", bank); // Actualizamos el valor del formulario
                                    setShowSuggestions(false); // Cerramos la lista
                                }}
                                className="px-3 py-2 hover:bg-base-200 cursor-pointer text-sm text-base-content transition-colors"
                            >
                                {bank}
                            </li>
                        ))}
                    </ul>
                )}

                {errors.bank && <span className="text-xs text-error">{errors.bank.message}</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cédula */}
                <div>
                    <label className="block text-sm font-medium text-base-content/80 mb-1">{t('form.payment.pago_movil.identity_label')}</label>
                    <input
                        type="number"
                        {...register("identity", { required: t('form.payment.pago_movil.validation.identity_required'), minLength: 6 })}
                        className="input input-bordered w-full"
                        placeholder={t('form.payment.pago_movil.identity_placeholder')}
                    />
                    {errors.identity && <span className="text-xs text-error">{errors.identity.message}</span>}
                </div>

                {/* Teléfono */}
                <div>
                    <label className="block text-sm font-medium text-base-content/80 mb-1">{t('form.payment.pago_movil.phone_label')}</label>
                    <input
                        type="tel"
                        {...register("phone", { required: t('form.payment.pago_movil.validation.phone_required') })}
                        className="input input-bordered w-full"
                        placeholder={t('form.payment.pago_movil.phone_placeholder')}
                    />
                    {errors.phone && <span className="text-xs text-error">{errors.phone.message}</span>}
                </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
                <label htmlFor="binanceDefault" className="text-sm text-base-content/80">{t('form.payment.common.validation_usage')}</label>
            </div>

            <button
                type="submit"
                className="btn btn-success text-success-content w-full"
            >
                {t('form.payment.pago_movil.submit')}
            </button>
        </form>
    );
};