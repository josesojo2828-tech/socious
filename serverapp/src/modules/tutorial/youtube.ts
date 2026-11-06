import type { RequestWithUser } from "src/shared/types/server.type";

/** Global-role check shared by the tutorial admin surface. */
export function isGlobalRole(user?: RequestWithUser["user"] | null): boolean {
  const name = user?.permits?.name;
  return name === "SUPERADMIN" || name === "ADMIN";
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Extracts the video id from any common YouTube URL form:
 * watch?v=, youtu.be/, /shorts/, /embed/ and /live/.
 */
export function parseYoutubeId(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (YOUTUBE_ID.test(value)) return value;

  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /\/shorts\/([A-Za-z0-9_-]{11})/,
    /\/embed\/([A-Za-z0-9_-]{11})/,
    /\/live\/([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export interface OembedVideo {
  title: string;
  authorName: string | null;
  thumbnailUrl: string;
}

/**
 * Reads the public oEmbed endpoint. No API key, no quota: it only returns the
 * title, the author and the thumbnail (never the description or duration).
 */
export async function fetchOembed(
  videoId: string,
  timeoutMs = 5_000,
): Promise<OembedVideo> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`,
      )}&format=json`,
      { signal: controller.signal },
    );
    if (!response.ok) {
      throw new Error(`YouTube respondió ${response.status}`);
    }
    const data = (await response.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    return {
      title: data.title?.trim() || "Tutorial de YouTube",
      authorName: data.author_name?.trim() || null,
      thumbnailUrl: data.thumbnail_url || youtubeThumbnail(videoId),
    };
  } finally {
    clearTimeout(timer);
  }
}
