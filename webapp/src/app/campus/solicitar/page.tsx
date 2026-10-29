"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { UploadCloud, CheckCircle2, ArrowLeft, FileText, Trash2, Loader2, GraduationCap, Award, Sparkles, BookOpen } from 'lucide-react';
import { apiClient } from '@/shared/api/api.client';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { PageGuide } from '@/components/ui/page-guide';
import { type TourStep } from '@/components/ui/guided-tour';
import { Navbar } from "@/features/public/components/Navbar";
import { Footer } from "@/features/public/components/Footer";
import Link from 'next/link';

interface University {
  id: string;
  name: string;
  shortName?: string;
}

const requestSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Ingresa un correo electrónico válido'),
  university: z.string().optional(),
  graduationDate: z.string().refine((val) => {
    const date = new Date(val);
    return date > new Date();
  }, {
    message: 'La fecha de graduación estimada debe ser en el futuro',
  }),
});

type RequestFormData = z.infer<typeof requestSchema>;

const TOUR_STORAGE_KEY = 'nutringest.campus.solicitar.tour.v1';

const TOUR_STEPS: TourStep[] = [
  {
    title: '¡Hola! Soy tu guía',
    body: 'Te acompaño paso a paso para que solicites tu acceso al Campus. Te tomo 30 segundos.',
    mood: 'wave',
  },
  {
    target: '[data-tour="name"]',
    title: 'Tu nombre y apellido',
    body: 'Escribilos tal como figuran en tu documento de identidad.',
    mood: 'happy',
  },
  {
    target: '[data-tour="email"]',
    title: 'Tu correo electrónico',
    body: 'Usa tu correo institucional o personal. Ahí te avisaremos cuando tu solicitud sea aprobada.',
    mood: 'thinking',
  },
  {
    target: '[data-tour="university"]',
    title: 'Tu universidad',
    body: 'Selecciona tu institución de la lista. Si no aparece, puedes escribirla a mano.',
    mood: 'reading',
  },
  {
    target: '[data-tour="graduation"]',
    title: 'Fecha de graduación',
    body: 'Ingresa tu fecha estimada de graduación. Tiene que ser una fecha futura.',
    mood: 'reading',
  },
  {
    target: '[data-tour="document"]',
    title: 'Documento de verificación',
    body: 'Sube una constancia o tu carnet universitario (PDF, PNG o JPG, máx 10MB). Es lo que valida tu condición de estudiante o pasante.',
    mood: 'typing',
  },
  {
    target: '[data-tour="submit"]',
    title: 'Enviar solicitud',
    body: 'Cuando tengas todo completo, haz clic aquí para enviar tu solicitud.',
    mood: 'success',
  },
  {
    title: '¡Eso es todo!',
    body: 'Revisaremos tu documento y, si tu solicitud es aprobada, te va a llegar un correo con tu código de acceso. ¡Muchos éxitos en tus prácticas!',
    mood: 'celebrate',
  },
];

export default function CampusSolicitarPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [universities, setUniversities] = useState<University[]>([]);
  const [universitiesLoading, setUniversitiesLoading] = useState(true);
  const [universitiesError, setUniversitiesError] = useState(false);
  const [selectedUniversityId, setSelectedUniversityId] = useState('');
  const [manualUniversity, setManualUniversity] = useState('');

  useEffect(() => {
    apiClient.get<{ list: University[] }>('/api/universities/active')
      .then((res) => {
        setUniversities(res.data.list || []);
        if (res.data.list?.length > 0) {
          setSelectedUniversityId(res.data.list[0].id);
        }
      })
      .catch(() => {
        setUniversitiesError(true);
      })
      .finally(() => {
        setUniversitiesLoading(false);
      });
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(selectedFile.type)) {
        addToast({
          type: 'error',
          title: 'Archivo no permitido',
          message: 'Solo se permiten archivos PDF, PNG, JPG o JPEG.',
        });
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        addToast({
          type: 'error',
          title: 'Archivo demasiado grande',
          message: 'El tamaño máximo es de 10MB.',
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(selectedFile.type)) {
        addToast({
          type: 'error',
          title: 'Archivo no permitido',
          message: 'Solo se permiten archivos PDF, PNG, JPG o JPEG.',
        });
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        addToast({
          type: 'error',
          title: 'Archivo demasiado grande',
          message: 'El tamaño máximo es de 10MB.',
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const onSubmit = async (data: RequestFormData) => {
    if (!file) {
      addToast({
        type: 'error',
        title: 'Documento requerido',
        message: 'Por favor, sube un documento que acredite tu condición de estudiante o pasante.',
      });
      return;
    }

    const universityId = universitiesError ? null : (selectedUniversityId || null);
    const universityName = universitiesError ? manualUniversity : (universities.find(u => u.id === selectedUniversityId)?.name || '');

    if (!universityId && !universityName) {
      addToast({
        type: 'error',
        title: 'Universidad requerida',
        message: 'Por favor, selecciona o ingresa tu universidad.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('firstName', data.firstName);
      formData.append('lastName', data.lastName);
      formData.append('email', data.email);
      if (universityId) {
        formData.append('universityId', universityId);
      }
      formData.append('university', universityName || data.university || '');
      formData.append('graduationDate', data.graduationDate);
      formData.append('document', file);

      await apiClient.post('/api/campus/request', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setIsSubmitted(true);
      addToast({
        type: 'success',
        title: 'Solicitud enviada',
        message: 'Tu solicitud ha sido recibida con éxito.',
      });
    } catch (err: any) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Error al enviar',
        message: err.response?.data?.message || 'Ocurrió un error al procesar tu solicitud.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="relative min-h-screen w-full flex flex-col justify-between bg-base-100 font-sans text-base-content">
        <Navbar />
        
        <div className="relative flex-grow flex flex-col items-center justify-start p-6 pt-32 sm:pt-36 lg:pt-40 pb-16 overflow-hidden">
          {/* Background blobs for premium depth */}
          <div className="absolute top-0 right-0 -z-10 opacity-30 translate-x-1/4 -translate-y-1/4 pointer-events-none">
            <div className="w-[600px] h-[600px] rounded-full bg-[#2b0c4f]/10 blur-[150px]" />
          </div>
          <div className="absolute bottom-0 left-0 -z-10 opacity-35 -translate-x-1/3 pointer-events-none">
            <div className="w-[500px] h-[500px] rounded-full bg-[#0d0ea0]/10 blur-[130px]" />
          </div>

          <main className="relative z-10 max-w-md w-full p-8 md:p-12 text-center rounded-[2.5rem] border border-base-300 bg-base-100 shadow-2xl">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-primary/10 text-primary rounded-full border border-primary/20 animate-pulse">
                <CheckCircle2 size={48} />
              </div>
            </div>

            <h1 className="text-3xl font-black mb-4 text-base-content leading-tight">¡Solicitud Recibida!</h1>
            <p className="text-base-content/60 leading-relaxed mb-8 text-sm font-medium">
              Registramos tus datos correctamente. Nuestro equipo revisará el documento de verificación y, en caso de ser aprobado, recibirás tu código de acceso por correo electrónico.
            </p>

            <Link 
              href="/" 
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold px-8 py-3 rounded-2xl transition-all shadow-md hover:-translate-y-0.5 active:translate-y-0"
            >
              <ArrowLeft size={16} /> Volver al inicio
            </Link>
          </main>
        </div>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-base-100 font-sans text-base-content">
      <Navbar />

      <div className="relative flex-grow flex flex-col items-center justify-start overflow-hidden p-4 sm:p-6 lg:p-8 pt-32 sm:pt-36 lg:pt-44 pb-20">
        
        {/* Background blobs for premium depth */}
        <div className="absolute top-0 right-0 -z-10 opacity-35 translate-x-1/4 -translate-y-1/4 pointer-events-none">
          <div className="w-[700px] h-[700px] rounded-full bg-[#2b0c4f]/10 blur-[150px]" />
        </div>
        <div className="absolute bottom-0 left-0 -z-10 opacity-40 -translate-x-1/3 pointer-events-none">
          <div className="w-[600px] h-[600px] rounded-full bg-[#0d0ea0]/10 blur-[130px]" />
        </div>

        {/* Page Header Section */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-8 sm:mb-12 relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/5 border border-primary/10 px-4 py-1.5 rounded-full">
            <GraduationCap className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              Nutringest Campus
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black leading-tight text-base-content">
            Solicitud de Acceso <span className="text-primary relative">Académico<span className="absolute bottom-1 left-0 w-full h-[6px] bg-primary/10 -z-10 rounded-full" /></span>
          </h1>
          <p className="text-base-content/60 text-sm sm:text-base lg:text-lg max-w-xl mx-auto font-medium leading-relaxed">
            Completá tus datos a continuación para obtener 120 días de acceso PRO gratuito durante tus prácticas profesionales de nutrición.
          </p>
        </div>

        <div className="relative z-10 max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch my-2">
          
          {/* Left Side: Striking info panel (Dark Theme matching Brand) */}
          <div className="col-span-12 lg:col-span-5 bg-gradient-to-br from-[#0b0518] to-[#1c0d38] rounded-[2rem] p-6 sm:p-8 lg:p-10 text-white flex flex-col justify-between relative overflow-hidden shadow-2xl border border-white/5">
            {/* Neon Glow Blobs inside the card */}
            <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-[#0d0ea0]/30 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-[#9333ea]/20 rounded-full blur-[80px] pointer-events-none" />

            {/* Top section */}
            <div className="space-y-6 z-10">
              <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors group">
                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-xs font-bold uppercase tracking-wider">Volver al Inicio</span>
              </Link>

              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 px-3 py-1 rounded-full">
                  <GraduationCap className="w-3.5 h-3.5 text-[#0d0ea0]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Nutringest Campus</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black leading-tight">
                  ¿Listo para destacar en tus pasantías?
                </h2>
                <p className="text-white/70 text-xs sm:text-sm leading-relaxed font-medium">
                  Accede a la herramienta elegida por profesionales de la nutrición y eleva la calidad de tu práctica académica.
                </p>
              </div>

              {/* Feature List */}
              <div className="space-y-4 pt-1">
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-[#0d0ea0]">
                    <Award size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">120 días premium sin costo</h4>
                    <p className="text-[11px] text-white/60 leading-relaxed">
                      Disfruta de todas las características de la versión PRO de forma gratuita durante tu período académico de prácticas.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-[#0d0ea0]">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">Informes de nivel clínico</h4>
                    <p className="text-[11px] text-white/60 leading-relaxed">
                      Exporta e imprime historias, antropometrías y planes impecables que sorprenderán a tus tutores de pasantía.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-[#0d0ea0]">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">Agiliza tus consultas reales</h4>
                    <p className="text-[11px] text-white/60 leading-relaxed">
                      Calcula macronutrientes al instante y optimiza la atención de tus pacientes reales asignados.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom brand slogan */}
            <div className="pt-6 border-t border-white/10 mt-6 z-10">
              <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold">
                Nutringest apoya la formación de los futuros profesionales de la nutrición en Venezuela.
              </p>
            </div>
          </div>

          {/* Right Side: Clean Modern Form Panel */}
          <div className="col-span-12 lg:col-span-7 bg-base-100 rounded-[2rem] p-5 sm:p-8 shadow-2xl border border-base-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-base-content leading-tight">Solicitar Acceso</h1>
                <p className="text-[11px] text-base-content/60 font-semibold mt-0.5">
                  Por favor, ingresa los datos a continuación para iniciar el proceso de verificación.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5" data-tour="name">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-base-content/80 uppercase tracking-wider">Nombre</label>
                    <input
                      type="text"
                      {...register('firstName')}
                      className="w-full bg-base-100 border border-base-300 rounded-xl px-3 py-2 text-sm text-base-content placeholder-base-content/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      placeholder="Juan"
                    />
                    {errors.firstName && <p className="text-xs text-red-500 font-semibold">{errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-base-content/80 uppercase tracking-wider">Apellido</label>
                    <input
                      type="text"
                      {...register('lastName')}
                      className="w-full bg-base-100 border border-base-300 rounded-xl px-3 py-2 text-sm text-base-content placeholder-base-content/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      placeholder="Pérez"
                    />
                    {errors.lastName && <p className="text-xs text-red-500 font-semibold">{errors.lastName.message}</p>}
                  </div>
                </div>

                <div className="space-y-1" data-tour="email">
                  <label className="text-[10px] font-bold text-base-content/80 uppercase tracking-wider">Correo Institucional / Personal</label>
                  <input
                    type="email"
                    {...register('email')}
                    className="w-full bg-base-100 border border-base-300 rounded-xl px-3 py-2 text-sm text-base-content placeholder-base-content/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    placeholder="juan.perez@universidad.edu"
                  />
                  {errors.email && <p className="text-xs text-red-500 font-semibold">{errors.email.message}</p>}
                </div>

                <div className="space-y-1" data-tour="university">
                  <label className="text-[10px] font-bold text-base-content/80 uppercase tracking-wider">Universidad / Institución de Estudios</label>
                  {universitiesLoading ? (
                    <div className="flex items-center gap-2 w-full bg-base-200 border border-base-300 rounded-xl px-3 py-2 text-sm text-base-content/60">
                      <Loader2 size={12} className="animate-spin text-primary" />
                      <span>Cargando universidades...</span>
                    </div>
                  ) : universitiesError ? (
                    <input
                      type="text"
                      value={manualUniversity}
                      onChange={(e) => setManualUniversity(e.target.value)}
                      className="w-full bg-base-100 border border-base-300 rounded-xl px-3 py-2 text-sm text-base-content focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      placeholder="Escribe el nombre de tu universidad"
                    />
                  ) : (
                    <select
                      value={selectedUniversityId}
                      onChange={(e) => setSelectedUniversityId(e.target.value)}
                      className="w-full bg-base-100 border border-base-300 rounded-xl px-3 py-2 text-sm text-base-content focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    >
                      {universities.map((u) => (
                        <option key={u.id} value={u.id} className="text-base-content">
                          {u.name}{u.shortName ? ` (${u.shortName})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-1" data-tour="graduation">
                  <label className="text-[10px] font-bold text-base-content/80 uppercase tracking-wider">Fecha Estimada de Graduación</label>
                  <input
                    type="date"
                    {...register('graduationDate')}
                    className="w-full bg-base-100 border border-base-300 rounded-xl px-3 py-2 text-sm text-base-content focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  />
                  {errors.graduationDate && <p className="text-xs text-red-500 font-semibold">{errors.graduationDate.message}</p>}
                </div>

                <div className="space-y-1" data-tour="document">
                  <label className="text-[10px] font-bold text-base-content/80 uppercase tracking-wider">Documento de Verificación (PDF, PNG, JPG)</label>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="border border-dashed border-base-300 hover:border-primary bg-base-200/50 hover:bg-base-200 rounded-2xl p-4 text-center transition-colors cursor-pointer relative"
                  >
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {!file ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <UploadCloud className="text-base-content/60" size={24} />
                        <p className="text-xs font-bold text-base-content/80">Arrastra tu archivo aquí o haz clic para buscar</p>
                        <p className="text-[10px] text-base-content/60 font-medium">Constancia, carnet universitario, etc. Máx 10MB.</p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-base-100 border border-base-300 p-2.5 rounded-xl shadow-sm">
                        <div className="flex items-center gap-2.5 text-left">
                          <FileText className="text-primary" size={20} />
                          <div className="max-w-[200px] truncate">
                            <p className="text-xs font-bold text-base-content truncate">{file.name}</p>
                            <p className="text-[10px] text-base-content/60 font-semibold">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setFile(null);
                          }}
                          className="p-1.5 hover:bg-base-200 text-red-500 hover:text-red-600 rounded-lg transition-colors border-none cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  data-tour="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-bold transition-all transform active:scale-[0.98] shadow-md shadow-primary/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none mt-4 cursor-pointer border-none outline-none text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Enviando solicitud...</span>
                    </>
                  ) : (
                    <span>Enviar Solicitud de Acceso</span>
                  )}
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>

      <PageGuide steps={TOUR_STEPS} storageKey={TOUR_STORAGE_KEY} whatsapp="584243153383" />

      <Footer />
    </div>
  );
}
