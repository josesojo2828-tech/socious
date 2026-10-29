'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCreateProduct } from '@/features/marketplace/hooks/useMutations';
import { useCategories } from '@/features/marketplace/hooks/useProducts';
import { RichTextEditor } from '@/features/marketplace/components/RichTextEditor';
import { MarketplaceGuard } from '@/shared/components/guards/MarketplaceGuard';
import { DashboardCard } from '@/features/nutringest/components/DashboardCard';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { ArrowLeft, Sparkles, Tag, Loader2, Image as ImageIcon, Link as LinkIcon, DollarSign } from 'lucide-react';

const productTypes = [
  { value: 'COURSE', label: 'Curso' },
  { value: 'EBOOK', label: 'Ebook' },
  { value: 'TEMPLATE', label: 'Plantilla' },
  { value: 'WEBINAR', label: 'Webinar' },
];

export default function CreateProductPage() {
  const router = useRouter();
  const { data: categories = [] } = useCategories();
  const createMutation = useCreateProduct();
  const addToast = useToastStore((state) => state.addToast);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'COURSE' as const,
    categoryId: '',
    price: 0,
    coverUrl: '',
    previewUrl: '',
    tags: [] as string[],
  });

  const [tagInput, setTagInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      addToast({ type: 'error', message: 'Por favor completa los campos requeridos.' });
      return;
    }

    createMutation.mutate(formData, {
      onSuccess: () => {
        addToast({ type: 'success', message: 'Producto publicado exitosamente.' });
        router.push('/dashboard/marketplace/products');
      },
      onError: (err: any) => {
        addToast({ type: 'error', message: err?.message || 'Error al publicar el producto.' });
      },
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  return (
    <MarketplaceGuard>
      <div className="space-y-6 pb-16 animate-in fade-in duration-500 font-sans max-w-4xl mx-auto">
        {/* 1. BACK BUTTON & PAGE HEADER */}
        <div className="flex flex-col gap-2">
          <Link
            href="/dashboard/marketplace/products"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-base-content/70 hover:text-primary transition-colors w-fit"
          >
            <ArrowLeft size={16} /> Volver a mis productos
          </Link>

          <div className="flex items-center gap-3 mt-1">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Sparkles size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-base-content tracking-tight uppercase">
                CREAR NUEVO PRODUCTO
              </h1>
              <p className="text-base-content/70 text-xs font-medium mt-0.5">
                Publica un nuevo recurso clínico o educativo en el catálogo del Marketplace
              </p>
            </div>
          </div>
        </div>

        {/* 2. FORM DASHBOARD CARD */}
        <DashboardCard className="p-8 shadow-sm border border-base-300">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Título del producto */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider block">
                TÍTULO DEL PRODUCTO *
              </label>
              <input
                type="text"
                className="w-full px-4 py-2.5 text-xs bg-base-200 border border-base-300 rounded-xl focus:bg-base-100 focus:border-primary outline-none transition-all text-base-content font-semibold"
                placeholder="Ej: Guía de Nutrición Deportiva y Periodización..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            {/* Descripción detallada */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider block">
                DESCRIPCIÓN DETALLADA *
              </label>
              <div className="rounded-xl border border-base-300 overflow-hidden bg-base-200">
                <RichTextEditor
                  value={formData.description}
                  onChange={(value) => setFormData({ ...formData, description: value })}
                  placeholder="Describe los objetivos, contenido y público objetivo de tu recurso..."
                />
              </div>
            </div>

            {/* Tipo y Categoría */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider block">
                  TIPO DE RECURSO *
                </label>
                <select
                  className="w-full px-4 py-2.5 text-xs bg-base-200 border border-base-300 rounded-xl focus:bg-base-100 focus:border-primary outline-none transition-all text-base-content font-medium cursor-pointer"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  {productTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider block">
                  CATEGORÍA
                </label>
                <select
                  className="w-full px-4 py-2.5 text-xs bg-base-200 border border-base-300 rounded-xl focus:bg-base-100 focus:border-primary outline-none transition-all text-base-content font-medium cursor-pointer"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                >
                  <option value="">Seleccionar categoría...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Precio */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider block">
                PRECIO EN USD ($) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 text-base-content/40" size={16} />
                <input
                  type="number"
                  className="w-full pl-9 pr-4 py-2.5 text-xs bg-base-200 border border-base-300 rounded-xl focus:bg-base-100 focus:border-primary outline-none transition-all text-base-content font-mono font-bold"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            {/* URLs de Imagen y Previsualización */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider block">
                  URL DE IMAGEN DE PORTADA
                </label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-2.5 text-base-content/40" size={16} />
                  <input
                    type="url"
                    className="w-full pl-9 pr-4 py-2.5 text-xs bg-base-200 border border-base-300 rounded-xl focus:bg-base-100 focus:border-primary outline-none transition-all text-base-content"
                    value={formData.coverUrl}
                    onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider block">
                  URL DE PREVISUALIZACIÓN / VIDEO
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-2.5 text-base-content/40" size={16} />
                  <input
                    type="url"
                    className="w-full pl-9 pr-4 py-2.5 text-xs bg-base-200 border border-base-300 rounded-xl focus:bg-base-100 focus:border-primary outline-none transition-all text-base-content"
                    value={formData.previewUrl}
                    onChange={(e) => setFormData({ ...formData, previewUrl: e.target.value })}
                    placeholder="https://youtube.com/..."
                  />
                </div>
              </div>
            </div>

            {/* Etiquetas */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider block">
                ETIQUETAS CLAVE
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 px-4 py-2 text-xs bg-base-200 border border-base-300 rounded-xl focus:bg-base-100 focus:border-primary outline-none transition-all text-base-content"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Escribe una etiqueta y presiona Enter..."
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-base-200 hover:bg-base-300 text-base-content/70 border border-base-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Agregar
                </button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.tags.map((tag, index) => (
                    <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                      <Tag size={11} /> {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-error ml-1">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="pt-6 border-t border-base-200 flex items-center justify-end gap-3">
              <Link
                href="/dashboard/marketplace/products"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-base-content/70 bg-base-200 hover:bg-base-300 border border-base-300 transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-primary-content bg-primary hover:bg-primary/90 shadow-md disabled:opacity-50 transition-all cursor-pointer"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publicando...</span>
                  </>
                ) : (
                  'Publicar Producto'
                )}
              </button>
            </div>
          </form>
        </DashboardCard>
      </div>
    </MarketplaceGuard>
  );
}
