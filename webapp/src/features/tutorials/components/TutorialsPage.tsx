"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  MessageCircle,
  Play,
  Search,
  Youtube,
} from "lucide-react";
import { useModalStore } from "@/shared/store/ui/useModalStore";
import { apiClient } from "@/shared/api/api.client";
import {
  CARD,
  CTA_BRASS,
  EYEBROW,
  GLASS,
  INPUT,
  PAGE_TITLE,
} from "@/shared/lib/maison-style";
import {
  TUTORIALS,
  TUTORIAL_SERIES,
  YOUTUBE_CHANNEL_URL,
} from "../data/tutorials";
import {
  filterTutorials,
  isPublished,
  youtubeThumbnail,
  type SeriesFilter,
} from "../lib/tutorial-filter";
import { TutorialVideoModal } from "./TutorialVideoModal";
import { TutorialEndpoints } from "../services/tutorials.endpoints";
import type { Tutorial, TutorialSeriesKey } from "../types";

const SALES_WHATSAPP = "584243153383";

/** One accent per series, kept inside the Maison palette. */
const SERIES_ACCENT: Record<TutorialSeriesKey, string> = {
  "primeros-pasos": "#b2944a",
  "dia-a-dia": "#1a2a46",
  diferencias: "#2f6f5e",
};

function seriesMeta(key: TutorialSeriesKey) {
  return TUTORIAL_SERIES.find((item) => item.key === key);
}

function seriesCount(list: Tutorial[], key: TutorialSeriesKey): number {
  return list.filter((tutorial) => tutorial.series === key).length;
}

interface ApiTutorial {
  id: string;
  youtubeId: string | null;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  series: string;
  duration: string | null;
  code: string | null;
  featured: boolean;
}

function toTutorial(row: ApiTutorial): Tutorial {
  return {
    id: row.id,
    code: row.code ?? "",
    title: row.title,
    description: row.description ?? "",
    series: (row.series as TutorialSeriesKey) ?? "primeros-pasos",
    duration: row.duration ?? "",
    youtubeId: row.youtubeId ?? undefined,
    cover: row.thumbnailUrl ?? undefined,
    featured: row.featured,
  };
}

function TutorialCard({
  tutorial,
  onOpen,
  size = "md",
}: {
  tutorial: Tutorial;
  onOpen: (tutorial: Tutorial) => void;
  size?: "md" | "lg";
}) {
  const published = isPublished(tutorial);
  const accent = SERIES_ACCENT[tutorial.series];
  const serie = seriesMeta(tutorial.series);
  // A custom cover wins (available before the video exists); otherwise the
  // YouTube thumbnail; otherwise the plain placeholder.
  const coverSrc =
    tutorial.cover ??
    (published && tutorial.youtubeId
      ? youtubeThumbnail(tutorial.youtubeId)
      : null);

  return (
    <button
      type="button"
      disabled={!published}
      onClick={() => onOpen(tutorial)}
      aria-label={
        published
          ? `Ver tutorial ${tutorial.code}: ${tutorial.title}`
          : `${tutorial.title} (próximamente)`
      }
      className={`${CARD} group relative flex flex-col overflow-hidden text-left transition-all duration-200 ${
        published
          ? "hover:-translate-y-0.5 hover:shadow-xl focus-visible:-translate-y-0.5 focus-visible:shadow-xl"
          : "cursor-default opacity-95"
      }`}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 z-10 h-1"
        style={{ backgroundColor: accent }}
      />

      <div
        className={`relative w-full overflow-hidden bg-gradient-to-br from-[#1a2a46] to-[#243a5e] ${
          size === "lg" ? "aspect-[16/9]" : "aspect-video"
        }`}
      >
        {coverSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverSrc}
            alt=""
            className={`h-full w-full object-cover transition-transform duration-500 ${
              published ? "group-hover:scale-105" : ""
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Play className="h-9 w-9 text-white/20" />
          </div>
        )}

        {!published ? (
          <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1a2a46] shadow-sm">
            Próximamente
          </span>
        ) : null}

        {published ? (
          <span className="absolute inset-0 flex items-center justify-center bg-[#0c101c]/25 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#b2944a] text-[#111018] shadow-2xl">
              <Play className="ml-1 h-6 w-6" />
            </span>
          </span>
        ) : null}

        <span className="absolute left-3 top-3 rounded-md bg-black/65 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
          {tutorial.code}
        </span>
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          <Clock className="h-3 w-3" />
          {tutorial.duration}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <span
          className="mb-1.5 inline-flex w-fit items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: accent }}
        >
          {serie?.label}
        </span>
        <h3
          className={`font-semibold leading-snug text-[#111018] dark:text-slate-100 ${
            size === "lg" ? "text-base" : "text-sm"
          }`}
        >
          {tutorial.title}
        </h3>
        <p className="mt-1.5 flex-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {tutorial.description}
        </p>

        <span
          className={`mt-3 inline-flex items-center gap-1 text-[11px] font-semibold ${
            published ? "" : "text-slate-400"
          }`}
          style={published ? { color: accent } : undefined}
        >
          {published ? (
            <>
              Ver tutorial <ArrowRight className="h-3.5 w-3.5" />
            </>
          ) : (
            "Se publica pronto"
          )}
        </span>
      </div>
    </button>
  );
}

export function TutorialsPage() {
  const { openModal, closeModal } = useModalStore();
  const [query, setQuery] = useState("");
  const [series, setSeries] = useState<SeriesFilter>("todos");
  /** Live catalog from the admin panel; the static list covers a cold start. */
  const [catalog, setCatalog] = useState<Tutorial[]>(TUTORIALS);

  useEffect(() => {
    let alive = true;
    void apiClient
      .get<ApiTutorial[]>(TutorialEndpoints.list)
      .then(({ data }) => {
        if (!alive) return;
        if (Array.isArray(data) && data.length > 0) {
          setCatalog(data.map(toTutorial));
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const browsing = series === "todos" && query.trim() === "";
  const visible = useMemo(
    () => filterTutorials(catalog, query, series),
    [catalog, query, series],
  );
  // Prefer a featured tutorial that is already published; while nothing is
  // uploaded, the first featured one keeps the slot (as "próximamente").
  const hero = useMemo(
    () =>
      catalog.find((tutorial) => tutorial.featured && isPublished(tutorial)) ??
      catalog.find((tutorial) => tutorial.featured) ??
      catalog[0],
    [catalog],
  );

  const open = (tutorial: Tutorial) => {
    if (!isPublished(tutorial)) return;
    openModal(
      <TutorialVideoModal tutorial={tutorial} onClose={closeModal} />,
      { size: "xl" },
    );
  };

  return (
    <div className="min-h-screen bg-[#f0ede4]/50 pb-20 dark:bg-[#0c101c]">
      <header
        className={`${GLASS} sticky top-0 z-30 border-b border-white/60 dark:border-white/10`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/login"
            className="font-display text-lg font-semibold text-[#111018] dark:text-slate-50"
          >
            Socius
          </Link>
          <div className="flex items-center gap-2">
            <a
              href={YOUTUBE_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-2 rounded-xl border border-[#1a2a46]/15 px-3 py-2 text-xs font-semibold text-[#1a2a46] transition-colors hover:bg-[#1a2a46]/5 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5 sm:inline-flex"
            >
              <Youtube className="h-4 w-4" /> Canal
            </a>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-[#1a2a46] px-4 py-2 text-sm font-semibold text-[#f0ede4] transition-colors hover:bg-[#243a5e]"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4">
        {/* Hero: pitch + the first tutorial a merchant should watch. */}
        <section className="grid grid-cols-1 items-center gap-8 pt-10 pb-8 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className={EYEBROW}>Recursos</p>
            <h1 className={PAGE_TITLE}>Tutoriales</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Videos cortos, una tarea por video. Cargá tu catálogo, vendé,
              controlá los abonos y entendé tus números sin leer manuales.
            </p>

            <div className="relative mt-6 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar: importar, abonos, tienda…"
                className={`pl-9 pr-3 py-2.5 ${INPUT}`}
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Play className="h-3.5 w-3.5 text-[#b2944a]" />
                {catalog.length} tutoriales
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#b2944a]" />3 minutos promedio
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ArrowRight className="h-3.5 w-3.5 text-[#b2944a]" />
                Uno por tarea
              </span>
            </div>
          </div>

          {hero ? (
            <div className="relative">
              <span className="absolute -left-3 -top-3 z-10 rounded-full bg-[#b2944a] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#111018] shadow-lg">
                Empezá acá
              </span>
              <TutorialCard tutorial={hero} onOpen={open} size="lg" />
            </div>
          ) : null}
        </section>

        {/* Category bar: sticky so the filter follows the scroll. */}
        <nav className="sticky top-[57px] z-20 -mx-4 mb-8 border-y border-[#1a2a46]/10 bg-[#f0ede4]/90 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-[#0c101c]/90">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSeries("todos")}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                series === "todos"
                  ? "bg-[#1a2a46] text-[#f0ede4]"
                  : "border border-[#1a2a46]/15 text-slate-600 hover:bg-[#1a2a46]/5 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"
              }`}
            >
              Todos · {catalog.length}
            </button>
            {TUTORIAL_SERIES.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setSeries(item.key)}
                title={item.description}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  series === item.key
                    ? "bg-[#1a2a46] text-[#f0ede4]"
                    : "border border-[#1a2a46]/15 text-slate-600 hover:bg-[#1a2a46]/5 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"
                }`}
              >
                {item.label} · {seriesCount(catalog, item.key)}
              </button>
            ))}
          </div>
        </nav>

        {browsing ? (
          // Browsing: one section per series, with its own heading.
          <div className="space-y-12">
            {TUTORIAL_SERIES.map((serie, index) => {
              const items = catalog.filter(
                (tutorial) => tutorial.series === serie.key,
              );
              if (items.length === 0) return null;
              const accent = SERIES_ACCENT[serie.key];

              return (
                <section key={serie.key} id={serie.key} className="scroll-mt-32">
                  <div className="mb-4 flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold text-white"
                      style={{ backgroundColor: accent }}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <h2 className="font-display text-xl font-semibold text-[#111018] dark:text-slate-50">
                        {serie.label}
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {serie.description} · {items.length} videos
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((tutorial) => (
                      <TutorialCard
                        key={tutorial.id}
                        tutorial={tutorial}
                        onOpen={open}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          // Searching or filtering: a flat result grid with a live count.
          <section>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              {visible.length === 0
                ? "Sin resultados"
                : `${visible.length} tutorial${visible.length === 1 ? "" : "es"}`}
              {series !== "todos" ? ` en “${seriesMeta(series)?.label}”` : ""}
              {query.trim() ? ` para “${query.trim()}”` : ""}
            </p>

            {visible.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#1a2a46]/20 px-6 py-14 text-center dark:border-white/15">
                <Search className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  No encontramos tutoriales con esa búsqueda.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSeries("todos");
                  }}
                  className="mt-3 text-sm font-semibold text-[#8e7538] underline-offset-2 hover:underline dark:text-[#d8c084]"
                >
                  Ver todos
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((tutorial) => (
                  <TutorialCard
                    key={tutorial.id}
                    tutorial={tutorial}
                    onOpen={open}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        <section
          className={`${CARD} relative mt-16 overflow-hidden p-8 text-center`}
        >
          <div
            aria-hidden
            className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#b2944a]/10 blur-3xl"
          />
          <h2 className="font-display text-2xl font-semibold text-[#111018] dark:text-slate-50">
            Dejá de ver y empezá a probar
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">
            Todo lo que viste está en tu cuenta en cinco minutos. Sin instalar
            nada.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className={`px-6 py-3 text-sm ${CTA_BRASS}`}>
              Crear mi cuenta
            </Link>
            <a
              href={`https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(
                "Hola, quiero saber más de Socius.",
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-[#1a2a46]/15 px-5 py-3 text-sm font-semibold text-[#1a2a46] transition-colors hover:bg-[#1a2a46]/5 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
            >
              <MessageCircle className="h-4 w-4" /> Hablar por WhatsApp
            </a>
            <a
              href={YOUTUBE_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#111018] dark:text-slate-400 dark:hover:text-white"
            >
              <Youtube className="h-4 w-4" /> Ver el canal
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
