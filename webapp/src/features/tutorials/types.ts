export type TutorialSeriesKey = "primeros-pasos" | "dia-a-dia" | "diferencias";

export interface TutorialSeries {
  key: TutorialSeriesKey;
  label: string;
  description: string;
}

export interface Tutorial {
  /** Stable id, used for keys and anchors. */
  id: string;
  /** Visible code: A3, B1, C2… */
  code: string;
  title: string;
  description: string;
  series: TutorialSeriesKey;
  /** Human duration, e.g. "4 min". */
  duration: string;
  /**
   * YouTube video id (the part after `v=`). Leave it empty until the video is
   * published: the card renders as "Próximamente" and cannot be opened.
   */
  youtubeId?: string;
  /**
   * Optional cover image (public path or absolute URL). Takes priority over the
   * YouTube thumbnail; useful while a video is not published yet.
   */
  cover?: string;
  /** Highlighted in the "Empezá por acá" strip. */
  featured?: boolean;
}
