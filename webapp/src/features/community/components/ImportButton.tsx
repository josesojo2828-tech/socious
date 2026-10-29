"use client";

import { useState } from "react";
import { Loader2, Download } from "lucide-react";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { importCommunityMenu, importCommunityExchangeList } from "../services/community.service";

type EntityType = "menu" | "exchange-list";

interface ImportButtonProps {
  communityItemId: string;
  entityType: EntityType;
  title?: string;
  onSuccess?: () => void;
}

const LABELS: Record<EntityType, { singular: string }> = {
  "menu": { singular: "Menú" },
  "exchange-list": { singular: "Lista de intercambio" },
};

export function ImportButton({ communityItemId, entityType = "menu", onSuccess }: ImportButtonProps) {
  const [loading, setLoading] = useState(false);
  const { addToast } = useToastStore();
  const label = LABELS[entityType].singular;

  const handleImport = async () => {
    setLoading(true);
    try {
      if (entityType === "menu") {
        await importCommunityMenu(communityItemId);
      } else {
        await importCommunityExchangeList(communityItemId);
      }
      addToast({
        type: "success",
        title: "¡Importado!",
        message: `${label} importado correctamente.`,
      });
      onSuccess?.();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Ocurrió un error al importar.";
      addToast({
        type: "error",
        title: "Error",
        message: Array.isArray(msg) ? msg[0] : msg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleImport}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-0"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Download className="w-3.5 h-3.5" />
      )}
      {loading ? "Importando..." : "Importar"}
    </button>
  );
}
