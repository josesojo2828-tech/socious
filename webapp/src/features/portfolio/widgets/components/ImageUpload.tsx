"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, X } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { cn } from "@/shared/lib/utils";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
}

export function ImageUpload({ value, onChange, label, className }: ImageUploadProps) {
  const { addToast } = useToastStore();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      addToast({ type: "error", title: "Error", message: "La imagen excede los 5MB." });
      return;
    }

    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowed.includes(file.type)) {
      addToast({ type: "error", title: "Error", message: "Solo PNG, JPG, JPEG, WEBP." });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiClient.post("/api/portfolio/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.success && res.data?.url) {
        onChange(res.data.url);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Error al subir la imagen.";
      addToast({ type: "error", title: "Error", message: Array.isArray(msg) ? msg[0] : msg });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = () => {
    onChange("");
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {label}
        </label>
      )}

      {value ? (
        <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Preview"
            className="w-full h-32 object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-white/90 text-slate-700 hover:bg-white transition-all cursor-pointer"
              title="Cambiar imagen"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-red-500/90 text-white hover:bg-red-500 transition-all cursor-pointer"
              title="Eliminar imagen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-32 rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs font-medium">Subiendo...</span>
            </>
          ) : (
            <>
              <Upload className="w-6 h-6" />
              <span className="text-xs font-medium">Click para subir imagen</span>
              <span className="text-[10px]">PNG, JPG, WEBP — Máx 5MB</span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
}
