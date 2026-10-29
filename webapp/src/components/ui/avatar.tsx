"use client";

import { motion, useReducedMotion, type TargetAndTransition, type Transition } from "framer-motion";
import { cn } from "@/shared/lib/utils";

export type AvatarMood =
  | "idle"
  | "happy"
  | "wave"
  | "welcome"
  | "celebrate"
  | "success"
  | "achievement"
  | "love"
  | "error"
  | "sad"
  | "loading"
  | "typing"
  | "thinking"
  | "reading"
  | "pointing"
  | "presenting"
  | "thumbsup"
  | "empty"
  | "confused"
  | "hungry"
  | "exercise"
  | "sleep"
  | "sick";

type AvatarAnimation =
  | "none"
  | "float"
  | "breathe"
  | "bounce"
  | "wave"
  | "shake"
  | "pulse"
  | "wiggle";

interface AvatarAsset {
  src: string;
  animation: AvatarAnimation;
}

const ASSETS: Record<AvatarMood, AvatarAsset> = {
  idle: { src: "/avatar/svg/emotions/happy.svg", animation: "float" },
  happy: { src: "/avatar/svg/emotions/happy.svg", animation: "float" },
  wave: { src: "/avatar/svg/scenes/waving.svg", animation: "wave" },
  welcome: { src: "/avatar/svg/scenes/waving.svg", animation: "wave" },
  celebrate: { src: "/avatar/svg/emotions/celebrating.svg", animation: "bounce" },
  success: { src: "/avatar/svg/scenes/trophy.svg", animation: "bounce" },
  achievement: { src: "/avatar/svg/scenes/trophy.svg", animation: "bounce" },
  love: { src: "/avatar/svg/emotions/inlove.svg", animation: "bounce" },
  error: { src: "/avatar/svg/emotions/sad.svg", animation: "shake" },
  sad: { src: "/avatar/svg/emotions/sad.svg", animation: "none" },
  loading: { src: "/avatar/svg/scenes/typing.svg", animation: "pulse" },
  typing: { src: "/avatar/svg/scenes/typing.svg", animation: "wiggle" },
  thinking: { src: "/avatar/svg/emotions/thinking.svg", animation: "pulse" },
  reading: { src: "/avatar/svg/emotions/deep_focus.svg", animation: "breathe" },
  pointing: { src: "/avatar/scenes/pointing.png", animation: "wiggle" },
  presenting: { src: "/avatar/scenes/presenting_chart.png", animation: "float" },
  thumbsup: { src: "/avatar/scenes/thumbsup.png", animation: "bounce" },
  empty: { src: "/avatar/svg/emotions/confused.svg", animation: "float" },
  confused: { src: "/avatar/svg/emotions/confused.svg", animation: "float" },
  hungry: { src: "/avatar/svg/emotions/hungry.svg", animation: "none" },
  exercise: { src: "/avatar/svg/scenes/yoga.svg", animation: "breathe" },
  sleep: { src: "/avatar/svg/scenes/sleeping.svg", animation: "breathe" },
  sick: { src: "/avatar/svg/emotions/sick.svg", animation: "none" },
};

interface AvatarAnim {
  animate?: TargetAndTransition;
  transition?: Transition;
}

const ANIMATIONS: Record<AvatarAnimation, AvatarAnim> = {
  none: {},
  float: {
    animate: { y: [0, -8, 0] },
    transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
  },
  breathe: {
    animate: { scale: [1, 1.04, 1] },
    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
  },
  bounce: {
    animate: { y: [0, -14, 0] },
    transition: { duration: 0.7, repeat: Infinity, repeatDelay: 0.6, ease: "easeOut" },
  },
  wave: {
    animate: { rotate: [0, 8, -8, 0] },
    transition: { duration: 1.4, repeat: Infinity, repeatDelay: 0.5, ease: "easeInOut" },
  },
  shake: {
    animate: { x: [0, -5, 5, -5, 5, 0] },
    transition: { duration: 0.5, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" },
  },
  pulse: {
    animate: { scale: [1, 1.06, 1] },
    transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
  },
  wiggle: {
    animate: { rotate: [-4, 4, -4] },
    transition: { duration: 0.9, repeat: Infinity, ease: "easeInOut" },
  },
};

export interface AvatarProps {
  mood?: AvatarMood;
  size?: number;
  className?: string;
  alt?: string;
}

export function Avatar({ mood = "idle", size = 120, className, alt }: AvatarProps) {
  const reduceMotion = useReducedMotion();
  const asset = ASSETS[mood] ?? ASSETS.idle;
  const anim = ANIMATIONS[asset.animation];

  return (
    <motion.img
      src={asset.src}
      alt={alt ?? `Avatar Eggder (${mood})`}
      draggable={false}
      className={cn("select-none object-contain drop-shadow-md", className)}
      style={{ width: size, height: size }}
      animate={reduceMotion ? undefined : anim.animate}
      transition={anim.transition}
    />
  );
}
