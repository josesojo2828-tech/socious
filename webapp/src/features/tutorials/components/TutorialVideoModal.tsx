"use client";

import { X } from "lucide-react";
import { useModalStore } from "@/shared/store/ui/useModalStore";
import { youtubeEmbedUrl } from "../lib/tutorial-filter";
import type { Tutorial } from "../types";

/** Player modal: the video only loads when the visitor opens the card. */
export function TutorialVideoModal({
  tutorial,
  onClose,
}: {
  tutorial: Tutorial;
  onClose: () => void;
}) {
  const { closeModal } = useModalStore();

  const close = () => {
    closeModal();
    onClose();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#b2944a]">
            Tutorial {tutorial.code} · {tutorial.duration}
          </p>
          <h2 className="mt-1 font-display text-lg font-semibold text-[#111018] dark:text-slate-50">
            {tutorial.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar"
          className="rounded-lg p-1.5 text-slate-400 hover:text-[#111018] dark:hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
        {tutorial.youtubeId ? (
          <iframe
            src={youtubeEmbedUrl(tutorial.youtubeId)}
            title={tutorial.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        ) : null}
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        {tutorial.description}
      </p>
    </div>
  );
}
