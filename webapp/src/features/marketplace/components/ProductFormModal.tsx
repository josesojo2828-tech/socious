'use client';

import { useState, useEffect } from 'react';
import { useCreateProduct, useUpdateProduct } from '../hooks/useMutations';
import { useCategories } from '../hooks/useProducts';
import { MarketProduct } from '../services/marketplace.service';
import { RichTextEditor } from './RichTextEditor';
import { X, Plus, Tag, Loader2, Sparkles, Image as ImageIcon, Link as LinkIcon, DollarSign } from 'lucide-react';

interface ProductFormModalProps {
  product?: MarketProduct;
  onClose: () => void;
}

const productTypes = [
  { value: 'COURSE', label: 'Curso' },
  { value: 'EBOOK', label: 'Ebook' },
  { value: 'TEMPLATE', label: 'Plantilla' },
  { value: 'WEBINAR', label: 'Webinar' },
];

export function ProductFormModal({ product, onClose }: ProductFormModalProps) {
  const { data: categories = [] } = useCategories();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

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

  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title,
        description: product.description,
        type: product.type as 'COURSE',
        categoryId: product.category?.id || '',
        price: product.price,
        coverUrl: product.coverUrl || '',
        previewUrl: product.previewUrl || '',
        tags: product.tags || [],
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (product) {
      updateMutation.mutate(
        { id: product.id, data: formData },
        { onSuccess: onClose }
      );
    } else {
      createMutation.mutate(formData, { onSuccess: onClose });
    }
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-base-100 rounded-3xl border border-base-300 shadow-2xl w-full max-w-3xl overflow-hidden my-8 transform transition-all">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-base-200 bg-base-200/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base-content text-lg">
                {product ? 'Editar Producto' : 'Publicar Nuevo Producto'}
              </h3>
              <p className="text-xs text-base-content/70">Completa la información técnica y comercial de tu recurso.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-base-content/50 hover:text-base-content hover:bg-base-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Título */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-base-content/70 uppercase tracking-wider">Título del Producto *</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 h-11 text-sm bg-base-200 border border-base-300 rounded-xl focus:bg-base-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-base-content font-medium"
              placeholder="Ej: Guía de Nutrición Deportiva y Periodización..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-base-content/70 uppercase tracking-wider">Descripción Detallada *</label>
            <div className="rounded-2xl border border-base-300 overflow-hidden bg-base-200">
              <RichTextEditor
                value={formData.description}
                onChange={(value) => setFormData({ ...formData, description: value })}
                placeholder="Describe los objetivos, contenido y a quién está dirigido tu producto..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tipo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-base-content/70 uppercase tracking-wider">Tipo de Recurso *</label>
              <select
                className="w-full px-4 py-2.5 h-11 text-sm bg-base-200 border border-base-300 rounded-xl focus:bg-base-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-base-content cursor-pointer"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              >
                {productTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Categoría */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-base-content/70 uppercase tracking-wider">Categoría</label>
              <select
                className="w-full px-4 py-2.5 h-11 text-sm bg-base-200 border border-base-300 rounded-xl focus:bg-base-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-base-content cursor-pointer"
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
            <label className="text-xs font-bold text-base-content/70 uppercase tracking-wider">Precio en USD ($) *</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 text-base-content/40 w-4 h-4" />
              <input
                type="number"
                className="w-full pl-9 pr-4 py-2.5 h-11 text-sm bg-base-200 border border-base-300 rounded-xl focus:bg-base-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-base-content font-mono font-bold"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>

          {/* URLs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-base-content/70 uppercase tracking-wider">URL de Imagen de Portada</label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-3 text-base-content/40 w-4 h-4" />
                <input
                  type="url"
                  className="w-full pl-9 pr-4 py-2.5 h-11 text-sm bg-base-200 border border-base-300 rounded-xl focus:bg-base-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-base-content"
                  value={formData.coverUrl}
                  onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-base-content/70 uppercase tracking-wider">URL de Previsualización</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-3 text-base-content/40 w-4 h-4" />
                <input
                  type="url"
                  className="w-full pl-9 pr-4 py-2.5 h-11 text-sm bg-base-200 border border-base-300 rounded-xl focus:bg-base-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-base-content"
                  value={formData.previewUrl}
                  onChange={(e) => setFormData({ ...formData, previewUrl: e.target.value })}
                  placeholder="https://youtube.com/..."
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-base-content/70 uppercase tracking-wider">Etiquetas Clave</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-4 py-2.5 h-11 text-sm bg-base-200 border border-base-300 rounded-xl focus:bg-base-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-base-content"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Escribe una etiqueta y presiona Enter..."
              />
              <button
                type="button"
                className="px-4 h-11 bg-base-200 hover:bg-base-300 text-base-content/70 border border-base-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                onClick={addTag}
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

          {/* Action Buttons */}
          <div className="pt-4 border-t border-base-200 flex items-center justify-end gap-3">
            <button
              type="button"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-base-content/70 bg-base-200 hover:bg-base-300 border border-base-300 transition-colors cursor-pointer"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-primary-content bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : product ? (
                'Guardar Cambios'
              ) : (
                'Publicar Producto'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
