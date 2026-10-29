'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Search, BookOpen, FileText, Video, Award, ChevronLeft, ChevronRight, AlertCircle, Loader2, RotateCcw, Plus, Filter } from 'lucide-react';
import { useProducts, useCategories } from '@/features/marketplace/hooks/useProducts';
import { ProductCard } from '@/features/marketplace/components/ProductCard';
import { DashboardCard } from '@/features/nutringest/components/DashboardCard';
import { ProductFilters as FiltersType } from '@/features/marketplace/services/marketplace.service';

export default function MarketplacePage() {
  const [filters, setFilters] = useState<FiltersType>({ search: '', categoryId: '', type: '', minPrice: undefined, maxPrice: undefined, page: 1, limit: 12 });
  const [uiFilters, setUiFilters] = useState({ search: '', categoryId: '', type: '', minPrice: '', maxPrice: '' });
  const { data, isLoading, error } = useProducts(filters);
  const { data: categories = [] } = useCategories();

  const handleFilterChange = (newFilters: typeof uiFilters) => {
    setUiFilters(newFilters);
    setFilters({
      ...filters,
      search: newFilters.search || undefined,
      categoryId: newFilters.categoryId || undefined,
      type: newFilters.type || undefined,
      minPrice: newFilters.minPrice ? Number(newFilters.minPrice) : undefined,
      maxPrice: newFilters.maxPrice ? Number(newFilters.maxPrice) : undefined,
      page: 1,
    });
  };

  const totalCount = data?.pagination.total || 0;
  const courseCount = data?.products.filter(p => p.type === 'COURSE' || p.type === 'WEBINAR').length || 0;
  const ebookCount = data?.products.filter(p => p.type === 'EBOOK' || p.type === 'TEMPLATE').length || 0;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500 font-sans">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-base-content tracking-tight uppercase">
            MARKETPLACE
          </h1>
          <p className="text-base-content/70 text-xs font-medium mt-0.5">
            Ecosistema de recursos digitales clínicos y educativos para nutricionistas
          </p>
        </div>

        <Link
          href="/dashboard/marketplace/products"
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-content text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer w-fit"
        >
          <Plus size={16} /> Mis Productos
        </Link>
      </div>

      {/* 2. STATS CARDS ROW (Matching StatsCardMenu) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard className="p-5 flex items-start justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-base-content/70 text-xs font-bold uppercase tracking-wider mb-1">TOTAL RECURSOS</p>
            <h3 className="text-2xl font-black text-base-content">{totalCount}</h3>
            <div className="flex items-center mt-2 text-xs font-medium text-base-content/70">
              <span className="bg-primary/10 px-2 py-0.5 rounded text-primary font-semibold">En catálogo</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            <ShoppingBag size={22} />
          </div>
        </DashboardCard>

        <DashboardCard className="p-5 flex items-start justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-base-content/70 text-xs font-bold uppercase tracking-wider mb-1">CURSOS & WEBINARS</p>
            <h3 className="text-2xl font-black text-base-content">{courseCount}</h3>
            <div className="flex items-center mt-2 text-xs font-medium text-base-content/70">
              <span className="bg-info/10 px-2 py-0.5 rounded text-info font-semibold">Capacitación</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-info/10 text-info">
            <Video size={22} />
          </div>
        </DashboardCard>

        <DashboardCard className="p-5 flex items-start justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-base-content/70 text-xs font-bold uppercase tracking-wider mb-1">EBOOKS & PLANTILLAS</p>
            <h3 className="text-2xl font-black text-base-content">{ebookCount}</h3>
            <div className="flex items-center mt-2 text-xs font-medium text-base-content/70">
              <span className="bg-success/10 px-2 py-0.5 rounded text-success font-semibold">Material clínico</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-success/10 text-success">
            <FileText size={22} />
          </div>
        </DashboardCard>

        <DashboardCard className="p-5 flex items-start justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-base-content/70 text-xs font-bold uppercase tracking-wider mb-1">GARANTÍA NUTRINGEST</p>
            <h3 className="text-2xl font-black text-base-content">100%</h3>
            <div className="flex items-center mt-2 text-xs font-medium text-base-content/70">
              <span className="bg-warning/10 px-2 py-0.5 rounded text-warning font-semibold">Autores verificados</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-warning/10 text-warning">
            <Award size={22} />
          </div>
        </DashboardCard>
      </div>

      {/* 3. MAIN CATALOG DASHBOARD CARD */}
      <DashboardCard className="p-6">
        {/* Toolbar & Filters (Matching Patients Page Header) */}
        <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-4 pb-6 border-b border-base-200">
          <div className="flex-1 max-w-md space-y-1">
            <label className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider">BÚSQUEDA</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-base-content/40" size={16} />
              <input
                type="text"
                placeholder="Buscar por título o etiqueta..."
                value={uiFilters.search}
                onChange={(e) => handleFilterChange({ ...uiFilters, search: e.target.value })}
                className="w-full pl-9 pr-4 py-2 text-xs bg-base-200 border border-base-300 rounded-xl focus:bg-base-100 focus:border-primary outline-none transition-all text-base-content"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Categoría Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider block">CATEGORÍA</label>
              <select
                value={uiFilters.categoryId}
                onChange={(e) => handleFilterChange({ ...uiFilters, categoryId: e.target.value })}
                className="px-3 py-2 text-xs bg-base-200 border border-base-300 rounded-xl focus:bg-base-100 focus:border-primary outline-none text-base-content font-medium cursor-pointer"
              >
                <option value="">Todas las categorías</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Tipo Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider block">TIPO</label>
              <select
                value={uiFilters.type}
                onChange={(e) => handleFilterChange({ ...uiFilters, type: e.target.value })}
                className="px-3 py-2 text-xs bg-base-200 border border-base-300 rounded-xl focus:bg-base-100 focus:border-primary outline-none text-base-content font-medium cursor-pointer"
              >
                <option value="">Todos los tipos</option>
                <option value="COURSE">Cursos</option>
                <option value="EBOOK">Ebooks</option>
                <option value="TEMPLATE">Plantillas</option>
                <option value="WEBINAR">Webinars</option>
              </select>
            </div>

            {(uiFilters.search || uiFilters.categoryId || uiFilters.type) && (
              <button
                onClick={() => handleFilterChange({ search: '', categoryId: '', type: '', minPrice: '', maxPrice: '' })}
                className="mt-5 p-2 rounded-xl border border-base-300 text-base-content/70 hover:bg-base-200 transition-colors"
                title="Limpiar filtros"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* PRODUCTS GRID / EMPTY STATE */}
        <div className="pt-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
              <span className="text-xs font-semibold text-base-content/70">Cargando catálogo...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-error/10 text-error rounded-xl text-xs font-medium">
              Ocurrió un error al consultar el catálogo.
            </div>
          ) : data?.products.length === 0 ? (
            /* EXACT EMPTY STATE MATCHING NUTRINGEST PATIENTS PAGE */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center text-base-content/40 mb-3">
                <Search size={28} />
              </div>
              <h3 className="text-base font-bold text-base-content">No existen registros.</h3>
              <p className="text-xs text-base-content/70 mt-1 max-w-sm">
                No encontramos productos que coincidan con la búsqueda. Prueba cambiar los filtros.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data?.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* PAGINATION */}
              {data && data.pagination.pages > 1 && (
                <div className="mt-8 pt-4 border-t border-base-200 flex items-center justify-center gap-2">
                  <button
                    disabled={filters.page === 1}
                    onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                    className="p-2 rounded-xl border border-base-300 text-base-content/70 hover:bg-base-200 disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: data.pagination.pages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setFilters({ ...filters, page })}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                          filters.page === page
                            ? 'bg-primary text-primary-content shadow-sm'
                            : 'bg-base-100 border border-base-300 text-base-content/70 hover:bg-base-200'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    disabled={filters.page === data.pagination.pages}
                    onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                    className="p-2 rounded-xl border border-base-300 text-base-content/70 hover:bg-base-200 disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </DashboardCard>
    </div>
  );
}
