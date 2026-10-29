import { notFound } from "next/navigation";
import { Avatar, type AvatarMood } from "@/components/ui/avatar";

const MOODS: AvatarMood[] = [
  "idle",
  "happy",
  "wave",
  "welcome",
  "celebrate",
  "success",
  "achievement",
  "love",
  "error",
  "sad",
  "loading",
  "typing",
  "thinking",
  "reading",
  "empty",
  "confused",
  "hungry",
  "exercise",
  "sleep",
  "sick",
];

export default function AvatarShowcasePage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="min-h-screen bg-base-100 p-10">
      <h1 className="mb-2 text-3xl font-bold text-base-content">Avatar Nutringest</h1>
      <p className="mb-8 text-base-content/60">
        Showcase de moods y micro-animaciones. Solo disponible en desarrollo.
      </p>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {MOODS.map((mood) => (
          <div
            key={mood}
            className="flex flex-col items-center gap-3 rounded-box border border-base-300 bg-base-200/40 p-4"
          >
            <Avatar mood={mood} size={140} />
            <span className="font-mono text-xs text-base-content/70">{mood}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
