import React from "react";
import { Heart, Mail, Phone, MapPin, Instagram } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/context/i18n.context";

export const Footer: React.FC = () => {
    const { t } = useTranslation();
    return (
        <footer className="bg-[#05040d] border-t border-white/5 px-6 lg:px-20 py-20 text-white max-w-7xl mx-auto rounded-t-[3rem] w-full">
            <div className="container mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-16">
                    
                    {/* Brand Section */}
                    <div className="lg:col-span-4 space-y-6 max-w-sm">
                        <div className="flex items-center gap-3">
                            <img src="/png/IsologoBlanco.png" alt="Nutringest Logo" className="w-10 h-auto" />
                            <span className="font-display text-xl font-bold uppercase tracking-wider text-white">Nutringest</span>
                        </div>
                        <p className="text-white/50 leading-relaxed text-sm">
                            Plataforma líder para la gestión integral de consultorios nutricionales. Tecnología avanzada y confiable al servicio de la salud.
                        </p>
                        <div className="pt-2">
                            <a
                                href="https://www.instagram.com/nutringest/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white font-bold text-xs shadow-lg shadow-pink-500/20 hover:shadow-pink-500/40 hover:scale-[1.03] active:scale-95 transition-all duration-200 cursor-pointer border border-white/20"
                                aria-label="Instagram Nutringest"
                            >
                                <Instagram className="w-4 h-4 text-white shrink-0" />
                                <span className="tracking-wide">@nutringest</span>
                            </a>
                        </div>
                    </div>

                    {/* Columns Section */}
                    <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-12 lg:gap-16">
                        
                        {/* Column 1: Producto */}
                        <div className="space-y-4">
                            <h4 className="font-bold text-sm text-white uppercase tracking-wider">
                                Producto
                            </h4>
                            <ul className="space-y-3 text-white/50 text-sm font-semibold">
                                <li><a href="/#features" className="hover:text-[#0d0ea0] transition-colors">Funciones</a></li>
                                <li><a href="/#pricing" className="hover:text-[#0d0ea0] transition-colors">Precios</a></li>
                                <li><Link href="/calculadora" className="hover:text-[#0d0ea0] transition-colors">Calculadora</Link></li>
                            </ul>
                        </div>

                        {/* Column 2: Empresa */}
                        <div className="space-y-4">
                            <h4 className="font-bold text-sm text-white uppercase tracking-wider">
                                Empresa
                            </h4>
                            <ul className="space-y-3 text-white/50 text-sm font-semibold">
                                <li><Link href="/blog" className="hover:text-[#0d0ea0] transition-colors">Blog</Link></li>
                            </ul>
                        </div>

                        {/* Column 3: Contacto */}
                        <div className="space-y-4">
                            <h4 className="font-bold text-sm text-white uppercase tracking-wider">
                                Contacto
                            </h4>
                            <ul className="space-y-3 text-white/50 text-sm font-semibold">
                                <li>
                                    <a
                                        href="mailto:nutringest@gmail.com"
                                        className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/90 font-semibold text-xs border border-white/10 hover:border-white/20 transition-all hover:scale-[1.02] active:scale-95 break-all"
                                    >
                                        <Mail className="w-4 h-4 text-purple-400 shrink-0" />
                                        <span>nutringest@gmail.com</span>
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="https://wa.me/584243153383?text=Hola,%20quisiera%20más%20información%20sobre%20Nutringest"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2.5 px-4.5 py-2.5 rounded-2xl bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white font-bold text-xs shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/45 hover:scale-[1.03] active:scale-95 transition-all duration-200 cursor-pointer border border-white/20"
                                    >
                                        <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24">
                                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.867-2.03-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.572-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                                        </svg>
                                        <span>WhatsApp: +58 424-3153383</span>
                                    </a>
                                </li>
                                <li className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-[#0d0ea0] shrink-0" />
                                    <span>Guárico, Venezuela</span>
                                </li>
                            </ul>
                        </div>

                    </div>
                </div>

                {/* Bottom Rights */}
                <div className="pt-8 border-t border-white/5 text-center text-white/30 text-xs flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p>© 2026 Nutringest. Todos los derechos reservados.</p>
                    <p className="flex items-center gap-1.5 justify-center">
                        De nutricionistas, para nutricionistas <Heart size={12} className="inline text-red-500 fill-red-500" />
                    </p>
                </div>
            </div>
        </footer>
    );
};