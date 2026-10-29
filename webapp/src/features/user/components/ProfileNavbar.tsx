import { Layers, LogOut } from "lucide-react";

export const ProfileNavbar = () => (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-base-100/80 border-b border-base-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[oklch(var(--color-primary))] flex items-center justify-center">
                        <Layers size={20} className="text-white" />
                    </div>
                    <span className="font-bold text-2xl tracking-tight">Flux<span className="text-primary">Sync</span></span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex flex-col items-end mr-2">
                        <span className="text-sm font-bold leading-none">John Doe</span>
                        <span className="text-xs opacity-60">john@fluxsync.com</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[oklch(var(--color-secondary))] text-white flex items-center justify-center shadow-md font-bold text-lg">
                        JD
                    </div>
                    <div className="h-8 w-[1px] bg-gray-300 mx-2"></div>
                    <button className="btn-ghost p-2 rounded-full text-gray-500 hover:text-red-500 transition-colors" title="Cerrar Sesión">
                        <LogOut size={20} />
                    </button>
                </div>
            </div>
        </div>
    </nav>
);