import Link from 'next/link';
import { LayoutDashboard, LifeBuoy, AlertCircle } from 'lucide-react';

export default function DashboardNotFound() {
    return (
        <div className="flex h-[calc(100vh-80px)] w-full items-center justify-center p-6 bg-slate-50">
            <div className="max-w-md w-full text-center">
                {/* Icono de Alerta Estilizado */}
                <div className="mb-6 flex justify-center">
                    <div className="relative">
                        <div className="h-24 w-24 rounded-full bg-indigo-100 flex items-center justify-center">
                            <AlertCircle className="h-12 w-12 text-indigo-600" />
                        </div>
                        {/* Pequeño adorno flotante */}
                        <div className="absolute -top-2 -right-2 h-8 w-8 rounded-lg bg-white shadow-md flex items-center justify-center">
                            <span className="text-xs font-bold text-indigo-600">404</span>
                        </div>
                    </div>
                </div>

                {/* Mensaje Principal */}
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Sección no encontrada
                </h2>
                <p className="text-slate-500 mb-8 leading-relaxed">
                    Lo sentimos, el recurso o la página que intentas consultar dentro de tu panel no está disponible o ha sido movida.
                </p>

                {/* Acciones Rápidas (Estilo Botones Dashboard) */}
                <div className="grid gap-3">
                    <Link
                        href="/dashboard"
                        className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-sm shadow-indigo-200"
                    >
                        <LayoutDashboard size={18} />
                        Regresar al Inicio
                    </Link>

                    <Link
                        href="/dashboard/soporte"
                        className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all"
                    >
                        <LifeBuoy size={18} />
                        Contactar Soporte Técnico
                    </Link>
                </div>

                {/* Footer de ayuda, similar al que tienes en el sidebar */}
                <p className="mt-8 text-sm text-slate-400">
                    ¿Crees que esto es un error? <span className="underline cursor-pointer">Notificar al equipo</span>
                </p>
            </div>
        </div>
    );
}