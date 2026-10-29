'use client';

import { FilterConfig, FilterField } from "@/types/filter.type";
import { Search, X, Calendar } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useTranslation } from "@/context/i18n.context";
import { ensureString } from "@/shared/lib/utils";

interface Props {
    config: FilterConfig | null;
    currentFilters: Record<string, any>;
    onFilter: (newFilters: Record<string, any>) => void;
}

export const DynamicFilter = ({ config, currentFilters, onFilter }: Props) => {
    const { t } = useTranslation();
    const [localFilters, setLocalFilters] = useState<Record<string, any>>({});
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (currentFilters) {
            setLocalFilters(currentFilters);
        }
    }, [currentFilters]);

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    if (!config || !config.fields || config.fields.length === 0) return null;

    const handleChange = (field: FilterField, value: any) => {
        const newFilters = { ...localFilters, [field.name]: value };

        if (value === '' || value === null || value === undefined) {
            delete newFilters[field.name];
        }

        setLocalFilters(newFilters);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (field.type === 'search') {
            debounceRef.current = setTimeout(() => {
                onFilter(newFilters);
            }, 500);
        } else {
            onFilter(newFilters);
        }
    };

    const handleSearchSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (debounceRef.current) clearTimeout(debounceRef.current);
        onFilter(localFilters);
    };

    const handleClear = () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setLocalFilters({});
        onFilter({});
    };

    return (
        <div className="w-full">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 w-full">

                {config.fields.map((field) => (
                    <div
                        key={field.name}
                        className={`flex flex-col gap-1 w-full ${field.type === 'search' ? 'sm:flex-grow sm:w-auto' : 'sm:w-52 shrink-0'}`}
                    >
                        {/* Label opcional */}
                        {field.label && (
                            <label className="text-xs font-semibold uppercase tracking-wider text-base-content/70 mb-0.5">
                                {ensureString(t(field.label))}
                            </label>
                        )}

                        {/* --- TYPE: SEARCH --- */}
                        {field.type === 'search' && (
                            <div className="relative w-full">
                                <input
                                    type="text"
                                    name={field.name}
                                    placeholder={ensureString(t(field.placeholder || 'Buscar...'))}
                                    value={localFilters[field.name] || ''}
                                    onChange={(e) => handleChange(field, e.target.value)}
                                    className="w-full pl-4 pr-10 py-2.5 text-sm text-base-content rounded-xl border border-base-300 bg-base-100/80 hover:border-base-300 focus:bg-base-100 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                                />
                                <button
                                    type="submit"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-primary p-1.5 transition-colors"
                                >
                                    <Search size={18} />
                                </button>
                            </div>
                        )}

                        {/* --- TYPE: SELECT --- */}
                        {field.type === 'select' && (
                            <div className="relative w-full">
                                <select
                                    name={field.name}
                                    value={localFilters[field.name] || ''}
                                    onChange={(e) => handleChange(field, e.target.value)}
                                    className="w-full pl-3 pr-8 py-2.5 text-sm text-base-content rounded-xl border border-base-300 bg-base-100/80 hover:border-base-300 focus:bg-base-100 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none cursor-pointer transition-all"
                                >
                                    <option value="">{ensureString(t(field.placeholder || 'Todos'))}</option>
                                    {field.options?.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {ensureString(t(opt.label))}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* --- TYPE: DATE --- */}
                        {field.type === 'date' && (
                            <div className="relative w-full">
                                <input
                                    type="date"
                                    name={field.name}
                                    value={localFilters[field.name] || ''}
                                    onChange={(e) => handleChange(field, e.target.value)}
                                    className="w-full pl-3 pr-3 py-2.5 text-sm text-base-content rounded-xl border border-base-300 bg-base-100/80 hover:border-base-300 focus:bg-base-100 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                                />
                                {!localFilters[field.name] && (
                                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 pointer-events-none" size={16} />
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {/* BOTÓN DE LIMPIAR */}
                {Object.keys(localFilters).length > 0 && (
                    <div className="flex justify-start sm:justify-end shrink-0">
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-2 text-base-content/50 hover:text-error hover:bg-error/10 rounded-xl transition-colors border border-base-300 bg-base-100 hover:border-error/20 h-10 w-10 flex items-center justify-center"
                            title="Limpiar filtros"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
};