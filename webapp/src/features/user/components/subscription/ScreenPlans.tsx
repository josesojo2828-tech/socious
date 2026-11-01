import { useSubscriptionPlan } from "@/features/subscription/hooks/useSusbcriptionPlan";
import { Text } from "@/shared/components/atoms/Text";
import { Check } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "@/context/i18n.context";
import { useModalStore } from "@/shared/store/ui/useModalStore";
import { ConfirmSubscriptionModal } from "./ConfirmSubscriptionModal";
import { useExchangeRate } from "@/shared/hooks/useExchangeRate";
import { normalizePlanContent } from "@/shared/authz";
import type { SubscriptionPlan } from "@/types/backend/schema.types";

const DEFAULT_COLORS = { bg: "#ffffff", text: "#1e293b", accent: "#4338ca", badge: "#4338ca" };
const FEATURED_DEFAULT = { bg: "#1e1b4b", text: "#ffffff", accent: "#4338ca", badge: "#4338ca" };

function formatPrice(price: number, currency: string, rate: number | null) {
    if (currency === 'VES' && rate) {
        const priceInVES = price * rate;
        return `Bs ${priceInVES.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return `$${price}`;
}

export function ScreenPlans({ Reload }: { Reload?: () => void }) {
    const { entities, loading } = useSubscriptionPlan({ action: 'findmany' });
    const { t } = useTranslation();
    const { openModal } = useModalStore();
    const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
    const { rate } = useExchangeRate();

    const visiblePlans = entities
        .filter(p => p.selected !== false)
        .sort((a, b) => Number(a.price) - Number(b.price));

    const featuredPlan = visiblePlans.find(p => p.featured === true) || null;
    const standardPlans = visiblePlans.filter(p => !p.featured);

    const handleSelectPlan = (plan: SubscriptionPlan) => {
        openModal(<ConfirmSubscriptionModal plan={plan} Reload={Reload} />, { size: 'sm' });
    };

    if (loading) return <div>{t('common.status.loading')}</div>;

    return (
        <section className="py-20 px-4 flex flex-col items-center justify-center font-sans">

            <div className="text-center max-w-3xl mx-auto mb-16">
                <Text as={'h2'} variant="h1">{t('common.subscription.plans_pricing')}</Text>
            </div>

            <div className="flex flex-col lg:flex-row items-stretch justify-center max-w-6xl w-full gap-8 lg:gap-0 relative">

                <div className={`grow lg:flex ${featuredPlan ? 'lg:w-2/3' : 'w-full'} bg-white dark:bg-slate-900 rounded-3xl shadow-xl z-10 overflow-hidden border border-gray-100 dark:border-slate-800`}>
                    {standardPlans.map((plan, index) => {
                        const c = plan.colorTheme || DEFAULT_COLORS;
                        return (
                            <div
                                key={plan.id}
                                className={`flex-1 p-8 md:p-12 flex flex-col ${index !== standardPlans.length - 1 ? 'border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-slate-800' : ''}`}
                            >
                                {plan.badge && (
                                    <div className="flex justify-start mb-4">
                                        <span
                                            className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg"
                                            style={{ backgroundColor: c.badge, color: '#fff' }}
                                        >
                                            {plan.badge}
                                        </span>
                                    </div>
                                )}

                                <div className="mb-6">
                                    <div className="flex items-baseline gap-1 mb-2">
                                        <span className="text-4xl font-extrabold text-gray-800 dark:text-slate-100">
                                            {formatPrice(
                                                billingCycle === 'MONTHLY' ? Number(plan.price) : Math.round(Number(plan.price) / 12),
                                                plan.currency || 'USD',
                                                rate
                                            )}
                                        </span>
                                        <span className="text-gray-400 dark:text-slate-400 font-medium">
                                            {plan.currency === 'VES' ? 'Bs/mes' : t('common.subscription.per_month_unit')}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-700 dark:text-slate-200 mb-2">{plan.name}</h3>
                                    <p className="text-sm text-gray-400 dark:text-slate-400 leading-relaxed min-h-[40px]">
                                        {plan.description}
                                    </p>
                                </div>

                                <ul className="space-y-4 mb-8 grow">
                                    {normalizePlanContent(plan.content).features.map((feature: string, idx: number) => (
                                        <li key={idx} className="flex items-center gap-3 text-sm text-gray-500 dark:text-slate-300 font-medium">
                                            <div
                                                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                                style={{ backgroundColor: c.accent + '20', color: c.accent }}
                                            >
                                                <Check size={12} strokeWidth={3} />
                                            </div>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => handleSelectPlan(plan)}
                                    className="w-full py-3 rounded-full font-bold transition-colors mt-auto"
                                    style={{
                                        border: `2px solid ${c.accent}30`,
                                        color: c.accent,
                                    }}
                                    onMouseOver={e => (e.currentTarget.style.backgroundColor = c.accent + '10')}
                                    onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                    {t('common.subscription.choose_plan')}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {featuredPlan && (
                    <div className="lg:w-1/3 lg:-ml-6 z-20 shrink-0">
                        <FeaturedCard plan={featuredPlan} billingCycle={billingCycle} onSelect={handleSelectPlan} />
                    </div>
                )}

            </div>
        </section>
    );
}

function FeaturedCard({ plan, billingCycle, onSelect }: { plan: SubscriptionPlan; billingCycle: 'MONTHLY' | 'YEARLY'; onSelect: (p: SubscriptionPlan) => void }) {
    const { t } = useTranslation();
    const { rate } = useExchangeRate();
    const c = plan.colorTheme || FEATURED_DEFAULT;

    return (
        <div
            className="rounded-3xl p-8 md:p-12 shadow-2xl h-full flex flex-col transform lg:scale-110 relative border"
            style={{ backgroundColor: c.bg, color: c.text, borderColor: c.accent + '40' }}
        >
            {plan.badge && (
                <div className="absolute top-0 right-0 left-0 flex justify-center -mt-4">
                    <span
                        className="text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg"
                        style={{ backgroundColor: c.badge, color: '#fff' }}
                    >
                        {plan.badge}
                    </span>
                </div>
            )}

            <div className="mb-6" style={{ marginTop: plan.badge ? undefined : '0.5rem' }}>
                <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-5xl font-extrabold" style={{ color: c.text }}>
                        {formatPrice(
                            billingCycle === 'MONTHLY' ? Number(plan.price) : Math.round(Number(plan.price) / 12),
                            plan.currency || 'USD',
                            rate
                        )}
                    </span>
                    <span className="font-medium" style={{ color: c.text + '99' }}>
                        {plan.currency === 'VES' ? 'Bs/mes' : t('common.subscription.per_month_unit')}
                    </span>
                </div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: c.text }}>{plan.name}</h3>
                <p className="text-sm leading-relaxed min-h-[40px]" style={{ color: c.text + '99' }}>
                    {plan.description}
                </p>
            </div>

            <ul className="space-y-4 mb-10 flex-grow">
                {normalizePlanContent(plan.content).features.map((feature: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-3 text-sm font-medium" style={{ color: c.text + 'cc' }}>
                        <div
                            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border"
                            style={{
                                backgroundColor: c.accent + '20',
                                color: c.accent,
                                borderColor: c.accent + '50',
                            }}
                        >
                            <Check size={12} strokeWidth={3} />
                        </div>
                        {feature}
                    </li>
                ))}
            </ul>

            <button
                onClick={() => onSelect(plan)}
                className="w-full py-4 rounded-full font-bold transition-all shadow-lg mt-auto"
                style={{
                    backgroundColor: c.accent,
                    color: '#fff',
                    boxShadow: `0 10px 15px -3px ${c.accent}40`,
                }}
                onMouseOver={e => (e.currentTarget.style.opacity = '0.9')}
                onMouseOut={e => (e.currentTarget.style.opacity = '1')}
            >
                {t('common.subscription.choose_plan')}
            </button>
        </div>
    );
}
