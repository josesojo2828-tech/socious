import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';

export function PremiumHubShowcase() {
    const { user } = useAuthStore();

    if (!user) {
        return null;
    }

    // Determinar plan del usuario
    const activeSub = user?.subscriptions?.find((s) => s.status === 'ACTIVE') || user?.subscriptions?.[0];
    const planName = (activeSub?.plan?.name || '').toUpperCase();
    const isPRO = planName === 'PRO';

    return (
        <section className="w-full">
            {/* Grid Bento minimalista de 4 tarjetas en 2 columnas/filas o grid de 4 */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isPRO ? 'lg:grid-cols-3' : 'lg:grid-cols-5'}`}>
                
                {/* 1. Campus Nutringest - NO visible para PRO */}
                {!isPRO && (
                <Link
                    href="/dashboard/campus"
                    className="group relative h-36 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-indigo-900/20 flex flex-col justify-end p-4 bg-slate-900"
                >
                    <Image
                        src="/png/hub/campus-v2.png"
                        alt="Campus Nutringest"
                        fill
                        className="object-cover object-center group-hover:scale-105 transition-transform duration-500 opacity-60 group-hover:opacity-75"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                    
                    <div className="relative z-10">
                        <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                            Campus Nutringest
                        </h3>
                        <p className="text-[11px] text-slate-300 font-medium">
                            Pasantías & Formación
                        </p>
                    </div>
                </Link>
                )}

                {/* 2. Comunidad Exclusiva - NO visible para PRO */}
                {!isPRO && (
                <Link
                    href="/dashboard/community"
                    className="group relative h-36 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-indigo-900/20 flex flex-col justify-end p-4 bg-slate-900"
                >
                    <Image
                        src="/png/hub/community-v2.png"
                        alt="Comunidad Nutringest"
                        fill
                        className="object-cover object-[center_15%] group-hover:scale-105 transition-transform duration-500 opacity-60 group-hover:opacity-75"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                    
                    <div className="relative z-10">
                        <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                            Comunidad Nutringest
                        </h3>
                        <p className="text-[11px] text-slate-300 font-medium">
                            Red de Nutricionistas
                        </p>
                    </div>
                </Link>
                )}

                {/* 3. Base de Alimentos (Tabla/General) */}
                <Link
                    href="/dashboard/foods"
                    className="group relative h-36 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-indigo-900/20 flex flex-col justify-end p-4 bg-slate-900"
                >
                    <Image
                        src="/png/hub/foods-base.png"
                        alt="Base de Alimentos"
                        fill
                        className="object-cover object-center group-hover:scale-105 transition-transform duration-500 opacity-60 group-hover:opacity-75"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                    
                    <div className="relative z-10">
                        <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                            Base de Alimentos
                        </h3>
                        <p className="text-[11px] text-slate-300 font-medium">
                            Tabla nutricional general
                        </p>
                    </div>
                </Link>

                {/* 4. Alimentos de Intercambio (Raciones) */}
                <Link
                    href="/dashboard/exchange-food"
                    className="group relative h-36 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-indigo-900/20 flex flex-col justify-end p-4 bg-slate-900"
                >
                    <Image
                        src="/png/hub/exchange-list.png"
                        alt="Alimentos de Intercambio"
                        fill
                        className="object-cover object-center group-hover:scale-105 transition-transform duration-500 opacity-60 group-hover:opacity-75"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                    
                    <div className="relative z-10">
                        <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                            Alimentos de Intercambio
                        </h3>
                        <p className="text-[11px] text-slate-300 font-medium">
                            Raciones por grupos y gramajes
                        </p>
                    </div>
                </Link>

                {/* 5. Marketplace */}
                <Link
                    href="/dashboard/marketplace"
                    className="group relative h-36 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-indigo-900/20 flex flex-col justify-end p-4 bg-slate-900"
                >
                    <Image
                        src="/png/hub/marketplace-v3.png"
                        alt="Marketplace"
                        fill
                        className="object-cover object-center group-hover:scale-105 transition-transform duration-500 opacity-60 group-hover:opacity-75"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                    
                    <div className="relative z-10">
                        <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                            Marketplace
                        </h3>
                        <p className="text-[11px] text-slate-300 font-medium">
                            Cursos, ebooks, templates & más
                        </p>
                    </div>
                </Link>

            </div>
        </section>
    );
}
