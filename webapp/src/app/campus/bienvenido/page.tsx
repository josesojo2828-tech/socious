"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, User, PlusCircle, FileText } from 'lucide-react';
import Link from 'next/link';

export default function CampusBienvenidoPage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden p-6 bg-[#064e3b] font-sans text-white select-none">
      {/* Decorative Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[500px] h-[500px] bg-[#9333ea] rounded-full blur-[80px] opacity-40 top-[-10%] right-[-10%]" />
        <div className="absolute w-[600px] h-[600px] bg-[#a7f3d0] rounded-full blur-[80px] opacity-30 bottom-[-20%] left-[-10%]" />
      </div>

      <main className="relative z-10 max-w-xl w-full text-center px-4">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-10 tracking-tight">
          ¡Te damos la bienvenida al <span className="text-[#a7f3d0] italic">Campus Nutringest</span>!
        </h1>

        {/* Onboarding steps */}
        <div className="text-left space-y-4 mb-8">
          <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            <div className="p-3 bg-purple-500/20 text-purple-300 rounded-xl h-fit">
              <User size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm">1. Configura tu perfil</h3>
              <p className="text-xs text-white/50">Agrega tu foto, tus credenciales de estudio y tu logo personalizado.</p>
            </div>
          </div>

          <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            <div className="p-3 bg-emerald-500/20 text-[#a7f3d0] rounded-xl h-fit">
              <PlusCircle size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm">2. Registra tu primer paciente</h3>
              <p className="text-xs text-white/50">Crea el perfil de tu paciente y empieza a recopilar sus datos clínicos.</p>
            </div>
          </div>

          <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            <div className="p-3 bg-blue-500/20 text-blue-300 rounded-xl h-fit">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm">3. Elabora un plan alimentario</h3>
              <p className="text-xs text-white/50">Utiliza nuestro calculador avanzado para definir macros y seleccionar alimentos.</p>
            </div>
          </div>
        </div>

        <Link href="/dashboard" className="w-full bg-[#9333ea] hover:bg-[#7e22ce] text-white py-4 rounded-xl font-bold transition-all transform active:scale-[0.98] shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 cursor-pointer border-none outline-none">
          <span>Comenzar ahora</span>
          <ArrowRight size={18} />
        </Link>
      </main>
    </div>
  );
}
