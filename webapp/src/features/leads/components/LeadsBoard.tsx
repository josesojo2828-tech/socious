"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  MessageCircle,
  Search,
} from "lucide-react";
import {
  BRASS_DOT,
  BTN_GHOST,
  CARD,
  CARD_HEADER,
  EYEBROW,
  INPUT,
  PAGE_TITLE,
} from "@/shared/lib/maison-style";
import { LEADS, LEADS_UPDATED_AT } from "../data";
import {
  STATUS_OPTIONS,
  filterLeads,
  leadCounts,
  leadStatus,
  leadsToCsv,
  socialLink,
  whatsappLink,
} from "../lib/leads";
import {
  getStatusesServerSnapshot,
  getStatusesSnapshot,
  setLeadStatus,
  subscribeStatuses,
} from "../lib/status-store";
import type { LeadPriority, LeadStatus } from "../types/lead.type";

const PRIORITY_STYLE: Record<LeadPriority, string> = {
  A: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  B: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  C: "border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
};

const TEMPLATES = [
  {
    id: "whatsapp",
    title: "Barbería / peluquería · WhatsApp",
    body: "Hola [nombre], ¿cómo estás? Soy [tu nombre], de Socius. Vi [negocio] en [zona]. Estamos ayudando a negocios pequeños de San Juan de los Morros a ordenar las citas y la caja del día: quién vino, cuánto pagó y quién quedó debiendo. ¿Te interesa que te muestre en 5 minutos cómo quedaría con tus servicios?",
  },
  {
    id: "instagram",
    title: "Uñas / estética · DM de Instagram",
    body: "Hola [nombre], vi tu trabajo de [uñas/cejas/pestañas] en [@handle] y me gustó. Soy [tu nombre], de Socius. Estoy hablando con estudios de San Juan para resolver algo simple: la agenda del día y el control de quién te debe el saldo. ¿Te puedo mostrar cómo se vería con tus servicios?",
  },
  {
    id: "followup",
    title: "Seguimiento · 3 días después",
    body: "Hola [nombre], te escribí el [día] por lo de la agenda y la caja. Si no es el momento, sin problema. Si te interesa, te dejo una demo de 5 minutos esta semana. ¿Te sirve el [día]?",
  },
  {
    id: "qualify",
    title: "Si responde · calificación",
    body: "1. ¿Cuántas citas atiendes al día y cómo las agendas hoy?\n2. ¿Cobras todo al momento o dejas saldo/fiado?\n3. ¿Quién lleva la cuenta de lo que entra al final del día?",
  },
];

function MobileLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-0.5 block text-[10px] uppercase tracking-[0.16em] text-slate-400 md:hidden">
      {children}
    </span>
  );
}

/** Internal prospecting board for San Juan de los Morros. */
export function LeadsBoard() {
  const statuses = useSyncExternalStore(
    subscribeStatuses,
    getStatusesSnapshot,
    getStatusesServerSnapshot,
  );
  const [term, setTerm] = useState("");
  const [rubro, setRubro] = useState("");
  const [status, setStatus] = useState<LeadStatus | "">("");
  const [onlyPhone, setOnlyPhone] = useState(false);
  const [copied, setCopied] = useState("");

  const rubros = useMemo(
    () => Array.from(new Set(LEADS.map((lead) => lead.rubro))).sort(),
    [],
  );

  const visible = useMemo(
    () => filterLeads(LEADS, { term, rubro, status, onlyPhone }, statuses),
    [term, rubro, status, onlyPhone, statuses],
  );

  const counts = useMemo(() => leadCounts(LEADS, statuses), [statuses]);

  async function copyTemplate(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied(""), 1500);
    } catch {
      setCopied("");
    }
  }

  function downloadCsv() {
    const csv = `\uFEFF${leadsToCsv(visible, statuses)}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `leads-sjm-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="pb-10">
      <p className={EYEBROW}>
        Herramientas internas
        <span className={BRASS_DOT} />
        San Juan de los Morros
      </p>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={PAGE_TITLE}>Leads de belleza</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Barberías, peluquerías, uñas y estética · {LEADS.length} registros ·
            actualizado {LEADS_UPDATED_AT}
          </p>
        </div>
        <button type="button" className={BTN_GHOST} onClick={downloadCsv}>
          <Download size={15} />
          Descargar CSV
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Leads", value: counts.total },
          { label: "Con teléfono", value: counts.withPhone },
          { label: "Trabajados", value: counts.worked },
          { label: "Respondieron", value: counts.answered },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-[#1b1d21]/12 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-900"
          >
            <b className="block font-display text-2xl font-semibold text-[#111018] dark:text-slate-50">
              {item.value}
            </b>
            <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <div className={`${CARD} mt-5 overflow-hidden`}>
        <div className={`${CARD_HEADER} flex flex-wrap items-center gap-2`}>
          <div className="relative min-w-[220px] flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Buscar negocio, zona o nota…"
              className={`${INPUT} pl-9`}
              aria-label="Buscar leads"
            />
          </div>

          <select
            value={rubro}
            onChange={(event) => setRubro(event.target.value)}
            className={`${INPUT} w-auto`}
            aria-label="Filtrar por rubro"
          >
            <option value="">Todos los rubros</option>
            {rubros.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as LeadStatus | "")
            }
            className={`${INPUT} w-auto`}
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <input
              type="checkbox"
              checked={onlyPhone}
              onChange={(event) => setOnlyPhone(event.target.checked)}
              className="h-4 w-4 accent-[var(--brand-primary)]"
            />
            Solo con teléfono
          </label>
        </div>

        <div className="hidden border-b border-[#1b1d21]/12 px-4 py-2.5 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:border-white/10 md:grid md:grid-cols-[130px_1.5fr_120px_1.4fr_1.6fr] md:gap-3">
          <span>Estado</span>
          <span>Negocio</span>
          <span>Rubro</span>
          <span>Contacto</span>
          <span>Zona / notas</span>
        </div>

        {visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            Nada coincide con el filtro.
          </p>
        ) : (
          visible.map((lead) => {
            const wa = whatsappLink(lead.phone);
            const social = socialLink(lead.instagram);
            const current = leadStatus(statuses, lead.name);

            return (
              <div
                key={lead.name}
                className="grid grid-cols-1 gap-2 border-b border-[#1b1d21]/8 px-4 py-4 last:border-0 hover:bg-[#1a2a46]/[0.03] dark:border-white/5 dark:hover:bg-white/5 md:grid-cols-[130px_1.5fr_120px_1.4fr_1.6fr] md:gap-3 md:py-3"
              >
                <div>
                  <MobileLabel>Estado</MobileLabel>
                  <select
                    value={current}
                    onChange={(event) =>
                      setLeadStatus(
                        lead.name,
                        event.target.value as LeadStatus,
                      )
                    }
                    className="w-full rounded-lg border border-[var(--brand-accent)]/15 bg-white/70 px-2 py-1.5 text-xs text-[#111018] dark:border-white/15 dark:bg-slate-950/40 dark:text-slate-100 md:w-[120px]"
                    aria-label={`Estado de ${lead.name}`}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <MobileLabel>Negocio</MobileLabel>
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${PRIORITY_STYLE[lead.priority]}`}
                      title={`Prioridad ${lead.priority}`}
                    >
                      {lead.priority}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#111018] dark:text-slate-100">
                        {lead.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {lead.rating
                          ? `${lead.rating} ★ · ${lead.reviews} reseñas`
                          : lead.source}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <MobileLabel>Rubro</MobileLabel>
                  <span className="inline-flex rounded-full border border-[var(--brand-accent)]/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-accent)] dark:border-white/15 dark:text-slate-300">
                    {lead.rubro}
                  </span>
                </div>

                <div className="space-y-1">
                  <MobileLabel>Contacto</MobileLabel>
                  {lead.phone ? (
                    wa ? (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--brand-accent)] hover:underline dark:text-slate-200"
                      >
                        <MessageCircle size={13} />
                        {lead.phone}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-600 dark:text-slate-300">
                        {lead.phone}
                      </span>
                    )
                  ) : (
                    <span className="text-xs text-slate-400">
                      Sin teléfono
                    </span>
                  )}
                  {social ? (
                    <a
                      href={social}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 truncate text-xs text-slate-500 hover:text-[var(--brand-accent)] hover:underline"
                    >
                      <ExternalLink size={12} />
                      {lead.instagram}
                    </a>
                  ) : null}
                </div>

                <div>
                  <MobileLabel>Zona / notas</MobileLabel>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {lead.address || "—"}
                  </p>
                  {lead.note ? (
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {lead.note}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold text-[#111018] dark:text-slate-50">
          Mensajes de primer contacto
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Copia, reemplaza los corchetes y personaliza el negocio. No envíes el
          mismo texto a todos.
        </p>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {TEMPLATES.map((template) => (
            <article key={template.id} className={`${CARD} p-4`}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  {template.title}
                </h3>
                <button
                  type="button"
                  className={BTN_GHOST}
                  onClick={() => copyTemplate(template.id, template.body)}
                >
                  {copied === template.id ? (
                    <>
                      <Check size={14} />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copiar
                    </>
                  )}
                </button>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">
                {template.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
        Fuente: fichas públicas de Google Maps, Instagram, TikTok, Facebook,
        LinkedIn y directorios locales. El teléfono y el horario pueden estar
        desactualizados: confirma antes del primer contacto. El estado se
        guarda en este navegador.
      </p>
    </div>
  );
}
