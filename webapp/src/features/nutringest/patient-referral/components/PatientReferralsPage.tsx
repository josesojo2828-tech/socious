'use client';

import { ArrowLeftRight, Inbox, Send } from 'lucide-react';
import { Tabs } from '@/shared/components/organisms/Tabs';
import { IncomingReferralsPanel } from './IncomingReferralsPanel';
import { OutgoingReferralsList } from './OutgoingReferralsList';

export const PatientReferralsPage = () => {
    return (
        <div className="w-full space-y-8 animate-fade-in font-sans text-slate-800 pb-16">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/60">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <ArrowLeftRight className="text-primary" size={28} />
                        Referidos
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        Solicitá y gestioná referidos de pacientes entre nutricionistas.
                    </p>
                </div>
            </div>

            <Tabs
                defaultValue="entrantes"
                variant="bordered"
                items={[
                    {
                        label: 'Entrantes',
                        value: 'entrantes',
                        icon: Inbox,
                        content: <IncomingReferralsPanel status="PENDING" />,
                    },
                    {
                        label: 'Salientes',
                        value: 'salientes',
                        icon: Send,
                        content: <OutgoingReferralsList />,
                    },
                ]}
            />
        </div>
    );
};