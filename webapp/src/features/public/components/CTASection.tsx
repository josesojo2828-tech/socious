import { useTranslation } from "@/context/i18n.context";

export const CTASection: React.FC = () => {
    const { t } = useTranslation();
    return (
        <section className="py-20 px-4">
            <div className="container mx-auto max-w-5xl">
                <div className="bg-linear-to-r from-emerald-600 to-teal-600 rounded-[3rem] p-12 lg:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-emerald-300">
                    {/* Background Circles */}
                    <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-900/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

                    <div className="relative z-10 max-w-2xl mx-auto">
                        <h2 className="text-3xl lg:text-5xl font-bold mb-6 tracking-tight">
                            {t('landing.cta.title')}
                        </h2>
                        <p className="text-emerald-100 text-lg mb-10 leading-relaxed">
                            {t('landing.cta.subtitle')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button className="btn bg-white text-emerald-600 border-none btn-lg rounded-full hover:bg-emerald-50 px-8 shadow-lg">
                                {t('landing.cta.btn_primary')}
                            </button>
                            <button className="btn btn-outline border-white text-white btn-lg rounded-full hover:bg-white/10 hover:border-white">
                                {t('landing.cta.btn_secondary')}
                            </button>
                        </div>
                        <p className="mt-8 text-sm text-emerald-200/80">
                            {t('landing.cta.note')}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}