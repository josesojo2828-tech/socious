'use client';

import { Filter, Search, RotateCcw } from 'lucide-react';
import { MarketCategory } from '../services/marketplace.service';

interface ProductFiltersProps {
  categories: MarketCategory[];
  filters: { search: string; categoryId: string; type: string; minPrice: string; maxPrice: string };
  onFilterChange: (filters: any) => void;
}

const productTypes = [
  { value: '', label: 'Todos' },
  { value: 'COURSE', label: 'Cursos' },
  { value: 'EBOOK', label: 'Ebooks' },
  { value: 'TEMPLATE', label: 'Plantillas' },
  { value: 'WEBINAR', label: 'Webinars' },
];

export function ProductFilters({ categories, filters, onFilterChange }: ProductFiltersProps) {
  return (
    <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-xs space-y-5">
      <div className="flex items-center gap-2 pb-3 border-b border-base-200">
        <Filter className="w-4 h-4 text-primary" />
        <h3 className="font-bold text-base-content text-sm uppercase tracking-wider">Filtros</h3>
      </div>

      {/* Search Input */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-base-content/70">Buscar</label>
        <div className="relative">
          <Search className="absolute left-3 top-3 text-base-content/40 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar productos..."
            className="w-full pl-9 pr-3 py-2.5 h-11 text-sm bg-base-200 border border-base-300 rounded-xl focus:bg-base-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-base-content"
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
          />
        </div>
      </div>

      {/* Product Type Select */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-base-content/70">Tipo de Recurso</label>
        <select
          className="w-full px-3 py-2.5 h-11 text-sm bg-base-200 border border-base-300 rounded-xl focus:bg-base-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-base-content cursor-pointer"
          value={filters.type}
          onChange={(e) => onFilterChange({ ...filters, type: e.target.value })}
        >
          {productTypes.map((type) => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      {/* Category Select */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-base-content/70">Categoría</label>
        <select
          className="w-full px-3 py-2.5 h-11 text-sm bg-base-200 border border-base-300 rounded-xl focus:bg-base-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-base-content cursor-pointer"
          value={filters.categoryId}
          onChange={(e) => onFilterChange({ ...filters, categoryId: e.target.value })}
        >
          <option value="">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Price Range Inputs */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-base-content/70">Rango de Precio ($)</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Mín"
            className="w-full px-3 py-2.5 h-11 text-sm bg-base-200 border border-base-300 rounded-xl focus:bg-base-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-base-content"
            value={filters.minPrice}
            onChange={(e) => onFilterChange({ ...filters, minPrice: e.target.value })}
          />
          <input
            type="number"
            placeholder="Máx"
            className="w-full px-3 py-2.5 h-11 text-sm bg-base-200 border border-base-300 rounded-xl focus:bg-base-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-base-content"
            value={filters.maxPrice}
            onChange={(e) => onFilterChange({ ...filters, maxPrice: e.target.value })}
          />
        </div>
      </div>

      {/* Clear Filters Button */}
      <button
        className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-base-content/70 bg-base-200 hover:bg-base-300 border border-base-300 rounded-xl transition-colors cursor-pointer"
        onClick={() => onFilterChange({ search: '', categoryId: '', type: '', minPrice: '', maxPrice: '' })}
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Limpiar Filtros
      </button>
    </div>
  );
}
