import type { Tutorial, TutorialSeriesKey } from "../types";

/** Lowercase without accents, so "Configuracion" matches "Configuración". */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export type SeriesFilter = TutorialSeriesKey | "todos";

/** Filters by free text (title + description) and by series. */
export function filterTutorials(
  tutorials: Tutorial[],
  query: string,
  series: SeriesFilter,
): Tutorial[] {
  const needle = normalizeText(query);
  return tutorials.filter((tutorial) => {
    if (series !== "todos" && tutorial.series !== series) return false;
    if (!needle) return true;
    return (
      normalizeText(tutorial.title).includes(needle) ||
      normalizeText(tutorial.description).includes(needle) ||
      normalizeText(tutorial.code).includes(needle)
    );
  });
}

/** Cards are playable only once a YouTube id was pasted. */
export function isPublished(tutorial: Tutorial): boolean {
  return Boolean(tutorial.youtubeId?.trim());
}

export function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId.trim()}/hqdefault.jpg`;
}

/** Privacy-enhanced embed: no YouTube cookies until the visitor plays. */
export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId.trim()}?rel=0&modestbranding=1`;
}
