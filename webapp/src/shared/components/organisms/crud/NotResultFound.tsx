import { SearchX } from "lucide-react";

export default function NoResults({ title = "No se encontraron resultados", message = "Intenta ajustar los filtros o buscar con términos diferentes." }) {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center bg-base-100 rounded-3xl shadow-sm border border-base-200 animate-in fade-in zoom-in duration-300">
      <div className="flex items-center justify-center w-24 h-24 mb-6 rounded-full bg-base-100 relative group">
        <div className="absolute inset-0 bg-success/5 rounded-full scale-0 group-hover:scale-110 transition-transform duration-500" />
        <SearchX className="w-12 h-12 text-base-content/30 group-hover:text-success transition-colors duration-300" />
      </div>
      <h3 className="mb-2 text-2xl font-bold tracking-tight text-base-content">{title}</h3>
      <p className="max-w-sm text-base-content/70 leading-relaxed">{message}</p>
    </div>
  );
};
