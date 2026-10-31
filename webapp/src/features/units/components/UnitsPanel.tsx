"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Ruler, Trash2 } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { SectionCard } from "@/shared/components/molecules/SectionCard";
import { Toggle } from "@/shared/components/atoms/Toggle";
import { UnitEndpoints } from "../services/units.endpoints";
import {
  UNIT_KIND_LABELS,
  type UnitKind,
  type UnitOfMeasure,
} from "../types/unit.type";

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

/**
 * Units of measure CRUD (S2): system defaults are read-only; merchants add
 * their own units (bolsa, pieza, caja…) next to UND/kg/g/lb/oz/L/mL.
 */
export function UnitsPanel() {
  const { addToast } = useToastStore();
  const [rows, setRows] = useState<UnitOfMeasure[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [name, setName] = useState<string>("");
  const [abbreviation, setAbbreviation] = useState<string>("");
  const [kind, setKind] = useState<UnitKind>("COUNT");
  const [saving, setSaving] = useState<boolean>(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<UnitOfMeasure[]>(UnitEndpoints.list);
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      addToast({
        type: "error",
        title: "Unidades",
        message: apiMessage(error, "No se pudieron cargar las unidades."),
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !abbreviation.trim()) {
      addToast({
        type: "warning",
        title: "Unidades",
        message: "Completá el nombre y la abreviatura.",
      });
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(UnitEndpoints.list, {
        name: name.trim(),
        abbreviation: abbreviation.trim(),
        kind,
      });
      setName("");
      setAbbreviation("");
      setKind("COUNT");
      void fetchList();
    } catch (error) {
      addToast({
        type: "error",
        title: "Unidades",
        message: apiMessage(error, "No se pudo crear la unidad."),
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (unit: UnitOfMeasure) => {
    try {
      await apiClient.patch(UnitEndpoints.detail(unit.id), {
        active: !unit.active,
      });
      void fetchList();
    } catch (error) {
      addToast({
        type: "error",
        title: "Unidades",
        message: apiMessage(error, "No se pudo actualizar la unidad."),
      });
    }
  };

  const remove = async (unit: UnitOfMeasure) => {
    try {
      await apiClient.delete(UnitEndpoints.detail(unit.id));
      void fetchList();
    } catch (error) {
      addToast({
        type: "error",
        title: "Unidades",
        message: apiMessage(error, "No se pudo eliminar la unidad."),
      });
    }
  };

  return (
    <SectionCard
      icon={<Ruler className="h-5 w-5" />}
      title="Unidades de medida"
      description="Las que aparecen al cargar productos y al vender por unidad o por peso."
    >
      <form onSubmit={submit} className="mb-4 flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Nombre</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Bolsa"
            className="mt-1 w-40 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Abreviatura</span>
          <input
            value={abbreviation}
            onChange={(event) => setAbbreviation(event.target.value)}
            placeholder="bolsa"
            maxLength={12}
            className="mt-1 w-28 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Tipo</span>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as UnitKind)}
            className="mt-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
          >
            {(Object.keys(UNIT_KIND_LABELS) as UnitKind[]).map((key) => (
              <option key={key} value={key}>
                {UNIT_KIND_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2"
        >
          <Plus className="h-4 w-4" /> Agregar
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((unit) => (
            <li
              key={unit.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {unit.name}{" "}
                  <span className="text-slate-400">({unit.abbreviation})</span>
                </p>
                <p className="text-xs text-slate-400">
                  {UNIT_KIND_LABELS[unit.kind]}
                  {unit.organizationId === null ? " · Sistema" : ""}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Toggle
                  checked={unit.active}
                  onChange={() => void toggleActive(unit)}
                />
                {unit.organizationId !== null ? (
                  <button
                    type="button"
                    aria-label={`Eliminar ${unit.name}`}
                    onClick={() => void remove(unit)}
                    className="rounded-lg p-1 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
