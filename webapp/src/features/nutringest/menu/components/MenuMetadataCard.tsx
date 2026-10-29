import React from 'react';
import { Clock, ChefHat, Scale, Users } from 'lucide-react';
import { BadgeMenu } from './BadgeMenu';
import { MenuDetailProps } from '../types/menu.details';

export const MenuMetadataCard = ({ menu }: MenuDetailProps) => {
    // Parseamos los tags si vienen como string "tag1, tag2"
    const tagsList = menu.tags ? menu.tags.split(',').map(t => t.trim()) : [];

    return (
        <section className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6 md:items-start justify-between">
                <div className="space-y-4 max-w-3xl flex-1">
                    <div className="flex flex-wrap gap-2">
                        {menu.category && (
                            <BadgeMenu color="purple" className="uppercase tracking-wide">
                                {menu.category}
                            </BadgeMenu>
                        )}
                        {tagsList.map(tag => (
                            <BadgeMenu key={tag} color="gray">#{tag}</BadgeMenu>
                        ))}
                    </div>

                    <div>
                        <p className="text-base-content/70 text-base leading-relaxed whitespace-pre-line">
                            {menu.description || "Sin descripción disponible."}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-6 pt-2">
                        {/* Tiempo de preparación */}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-base-200 rounded-lg border border-base-300">
                            <Clock size={18} className="text-purple-600 dark:text-purple-400" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-base-content/50 uppercase">Tiempo</span>
                                <span className="text-sm font-bold text-base-content">
                                    {menu.prepTime ? `${menu.prepTime} min` : '—'}
                                </span>
                            </div>
                        </div>
                        {/* Dificultad */}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-base-200 rounded-lg border border-base-300">
                            <ChefHat size={18} className="text-purple-600 dark:text-purple-400" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-base-content/50 uppercase">Dificultad</span>
                                <span className="text-sm font-bold text-base-content">
                                    {menu.difficulty || '—'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-base-200 rounded-lg border border-base-300">
                            <Scale size={18} className="text-purple-600 dark:text-purple-400" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-base-content/50 uppercase">Ingredientes</span>
                                <span className="text-sm font-bold text-base-content">{menu.items.length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Asignaciones Rápidas (Placeholder visual) */}
                <div className="hidden lg:block p-4 bg-base-200 rounded-lg border border-base-300 min-w-[200px]">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-base-content/50 uppercase">Pacientes Asignados</h4>
                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400">0</span>
                    </div>
                    <div className="flex items-center justify-center py-4 border-2 border-dashed border-base-300 rounded-lg bg-base-100">
                        <span className="text-xs text-base-content/50 flex items-center gap-1">
                            <Users size={14} /> Sin asignar
                        </span>
                    </div>
                    <button className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium w-full text-left mt-2">
                        Ver historial de uso
                    </button>
                </div>
            </div>
        </section>
    );
};
