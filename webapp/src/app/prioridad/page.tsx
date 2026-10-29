"use client";

import { useState } from "react";
import { User, Mail, Phone, MapPin, Lock, Eye, EyeOff, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { Image } from "@/shared/components/atoms/Image";
import { Button } from "@/shared/components/atoms/Button";
import CountryPhoneInput from "@/shared/components/CountryPhoneInput";

export default function PrioridadPage() {
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        password: "",
        city: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.firstName || !formData.email || !formData.password) {
            setError("Los campos Nombre, Correo y Contraseña son obligatorios.");
            return;
        }

        setIsLoading(true);

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const res = await fetch(`${API_URL}/priority-leads`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Ocurrió un error al registrarse.");
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || "Error de conexión con el servidor.");
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <main className="flex min-h-screen w-full bg-base-200 items-center justify-center p-4">
                <div className="bg-base-100 p-10 rounded-3xl shadow-xl max-w-lg text-center border border-base-300 animate-in fade-in zoom-in duration-500">
                    <CheckCircle2 className="mx-auto h-24 w-24 text-emerald-500 mb-6" />
                    <h1 className="text-4xl font-black text-base-content mb-4 tracking-tight">¡Registro Exitoso!</h1>
                    <p className="text-base-content/60 text-lg leading-relaxed mb-8">
                        Tus datos han sido registrados en nuestra base de datos prioritaria. Un miembro de nuestro equipo te contactará en las próximas 24 horas.
                    </p>
                    <Button
                        onClick={() => window.location.href = "/"}
                        className="bg-emerald-500 hover:bg-emerald-600 outline-none border-none text-white py-4 px-8 rounded-2xl font-bold shadow-lg shadow-emerald-200"
                    >
                        Volver al Inicio
                    </Button>
                </div>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen w-full bg-base-100 font-sans">
            {/* Columna Izquierda: Información */}
            <section className="hidden lg:flex w-[45%] flex-col justify-between bg-[#1A202C] p-12 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-600/20 blur-[120px] rounded-full -z-0"></div>
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 blur-[100px] rounded-full -z-0"></div>

                <div className="relative z-10 w-full mb-8">
                    {/* Placeholder para logo en webapp */}
                    <div className="text-white text-3xl font-black flex items-center gap-2">
                        <span className="text-emerald-500">Nutri</span>ngest
                    </div>
                </div>

                <div className="relative z-10 space-y-8 my-auto">
                    <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight">
                        Asegura tu lugar en<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                            nuestro prelanzamiento.
                        </span>
                    </h1>
                    <p className="text-slate-300 text-lg leading-relaxed max-w-md">
                        Regístrate ahora para obtener acceso anticipado y prioritario a la plataforma Nutringest. Nos contactaremos de forma personalizada en las próximas 24 horas.
                    </p>
                    <div className="flex gap-4 items-center">
                        <div className="flex -space-x-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="w-12 h-12 rounded-full border-2 border-[#1A202C] bg-slate-700 flex items-center justify-center text-xs font-bold text-white shadow-sm overflow-hidden">
                                    <Image src={`/png/avatar-${(i % 3) + 1}.png`} alt="User" width={48} height={48} className="object-cover" />
                                </div>
                            ))}
                        </div>
                        <p className="text-sm font-semibold text-slate-400 max-w-[200px] leading-tight">
                            Únete a cientos de profesionales en lista de espera.
                        </p>
                    </div>
                </div>
            </section>

            {/* Columna Derecha: Formulario */}
            <section className="w-full lg:w-[55%] flex items-center justify-center p-6 md:p-12 lg:p-20 bg-base-200 relative">
                <div className="w-full max-w-[520px] bg-base-100 p-8 sm:p-10 rounded-3xl shadow-2xl shadow-slate-200/50 border border-base-300">
                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-black text-base-content mb-2">Acceso Prioritario</h2>
                        <p className="text-base-content/60 font-medium">Déjanos tus datos y te contactaremos a la brevedad.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-2xl bg-error/10 border border-error/20 text-error text-sm font-bold flex items-center animate-in shake duration-300">
                            {error}
                        </div>
                    )}

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {/* Nombre */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-widest text-base-content/60 ml-1">Nombre *</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/60 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        disabled={isLoading}
                                        placeholder="Ej. Juan"
                                        className="w-full pl-11 pr-4 py-3.5 bg-base-100 border border-base-300 rounded-2xl focus:bg-base-100 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all outline-none text-base-content placeholder-base-content/40 font-medium disabled:opacity-50"
                                        required
                                    />
                                </div>
                            </div>
                            {/* Apellido */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-widest text-base-content/60 ml-1">Apellido</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/60 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        disabled={isLoading}
                                        placeholder="Ej. Pérez"
                                        className="w-full pl-11 pr-4 py-3.5 bg-base-100 border border-base-300 rounded-2xl focus:bg-base-100 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all outline-none text-base-content placeholder-base-content/40 font-medium disabled:opacity-50"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Correo */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-widest text-base-content/60 ml-1">Correo Electrónico *</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/60 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                    placeholder="hola@ejemplo.com"
                                    className="w-full pl-11 pr-4 py-3.5 bg-base-100 border border-base-300 rounded-2xl focus:bg-base-100 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all outline-none text-base-content placeholder-base-content/40 font-medium disabled:opacity-50"
                                    required
                                />
                            </div>
                        </div>

                        {/* Teléfono */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-widest text-base-content/60 ml-1">Teléfono (WhatsApp)</label>
                            <CountryPhoneInput
                                value={formData.phone}
                                onChange={(val) => setFormData(prev => ({ ...prev, phone: val }))}
                                disabled={isLoading}
                                placeholder="4141234567"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {/* Contraseña */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-widest text-base-content/60 ml-1">Contraseña *</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/60 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        disabled={isLoading}
                                        placeholder="••••••••"
                                        className="w-full pl-11 pr-12 py-3.5 bg-base-100 border border-base-300 rounded-2xl focus:bg-base-100 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all outline-none text-base-content placeholder-base-content/40 font-medium disabled:opacity-50"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-base-content/60 hover:text-base-content/80 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            {/* Ciudad */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-widest text-base-content/60 ml-1">Ciudad</label>
                                <div className="relative group">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/60 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        disabled={isLoading}
                                        placeholder="Tu ciudad"
                                        className="w-full pl-11 pr-4 py-3.5 bg-base-100 border border-base-300 rounded-2xl focus:bg-base-100 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all outline-none text-base-content placeholder-base-content/40 font-medium disabled:opacity-50"
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full mt-4 py-5 bg-base-content hover:bg-base-content/90 text-base-100 rounded-2xl font-black text-lg shadow-xl shadow-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Registrando...
                                </>
                            ) : (
                                <>
                                    Solicitar Acceso
                                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </Button>
                        <p className="text-center text-[11px] text-base-content/60 mt-4 leading-relaxed font-medium">
                            Tus datos están protegidos. Prometemos no enviar spam.
                        </p>
                    </form>
                </div>
            </section>
        </main>
    );
}
