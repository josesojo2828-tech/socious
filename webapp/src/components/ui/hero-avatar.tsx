"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Avatar, type AvatarMood } from "./avatar";
import {
  Sparkles,
  Heart,
  Award,
  Brain,
  Hand,
  Utensils,
} from "lucide-react";

const MOOD_MESSAGES: Record<string, { title: string; text: string; icon: React.ReactNode; badge: string }> = {
  welcome: {
    title: "¡Hola, profesional! 👋",
    text: "Soy Eggder. Tu copiloto clínico en Nutringest.",
    icon: <Hand className="w-3.5 h-3.5 text-amber-500 animate-bounce" />,
    badge: "Asistente Virtual",
  },
  happy: {
    title: "¡Consulta sin estrés! ✨",
    text: "Historias clínicas y evaluaciones ordenadas al instante.",
    icon: <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />,
    badge: "Gestión Eficiente",
  },
  thinking: {
    title: "Precisión metabólica 🧠",
    text: "Fórmulas ISAK 1, somatocarta y métricas metabólicas.",
    icon: <Brain className="w-3.5 h-3.5 text-info animate-pulse" />,
    badge: "Protocolo ISAK",
  },
  celebrate: {
    title: "¡14 Días Gratis! 🎉",
    text: "Acceso total e inmediato sin tarjeta de crédito.",
    icon: <Heart className="w-3.5 h-3.5 text-error fill-error animate-bounce" />,
    badge: "Prueba Sin Riesgo",
  },
  achievement: {
    title: "Estándar Premium 🏆",
    text: "Reportes PDF listos para enviar por WhatsApp.",
    icon: <Award className="w-3.5 h-3.5 text-amber-400 animate-bounce" />,
    badge: "Formato A4 PDF",
  },
  typing: {
    title: "Planes Nutricionales 📋",
    text: "Distribución de macronutrientes rápida e intuitiva.",
    icon: <Utensils className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />,
    badge: "Dietas Personalizadas",
  },
};

export interface HeroAvatarProps {
  className?: string;
  initialMood?: AvatarMood;
  mood?: AvatarMood;
  floating?: boolean;
}

export function HeroAvatar({
  className = "",
  initialMood = "welcome",
  mood: propMood,
  floating = false,
}: HeroAvatarProps) {
  const [mood, setMood] = useState<AvatarMood>(propMood || initialMood);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  useEffect(() => {
    if (propMood) {
      setMood(propMood);
    }
  }, [propMood]);

  const currentMsg = MOOD_MESSAGES[mood] || MOOD_MESSAGES.welcome;

  // 2.5D Parallax Physics
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 22, stiffness: 130 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Parallax offsets per layer
  const bgX = useTransform(smoothX, [-0.5, 0.5], [14, -14]);
  const bgY = useTransform(smoothY, [-0.5, 0.5], [14, -14]);

  const avatarX = useTransform(smoothX, [-0.5, 0.5], [-12, 12]);
  const avatarY = useTransform(smoothY, [-0.5, 0.5], [-12, 12]);
  const avatarRotate = useTransform(smoothX, [-0.5, 0.5], [-3, 3]);

  // Speech Bubble (Top Right / Top Floating)
  const bubbleX = useTransform(smoothX, [-0.5, 0.5], [18, -18]);
  const bubbleY = useTransform(smoothY, [-0.5, 0.5], [-14, 14]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const cycleMood = () => {
    const moods: AvatarMood[] = ["welcome", "happy", "thinking", "celebrate", "achievement", "typing"];
    const nextIdx = (moods.indexOf(mood) + 1) % moods.length;
    setMood(moods[nextIdx]);
  };

  if (floating) {
    return (
      <div className={`fixed bottom-24 right-5 sm:bottom-6 sm:right-24 z-40 flex flex-col items-end select-none pointer-events-auto ${className}`}>
        {/* Floating Speech Bubble */}
        <AnimatePresence mode="wait">
          {!isMinimized && (
            <motion.div
              key={mood}
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              transition={{ duration: 0.25 }}
              className="bg-base-100/95 border border-primary/30 shadow-2xl rounded-2xl p-3 sm:p-3.5 backdrop-blur-md w-[220px] sm:w-[240px] space-y-1 mb-2 relative shadow-primary/10"
            >
              <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-base-200/80">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-black tracking-wider uppercase text-primary">
                    Eggder Copilot
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {currentMsg.icon}
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="text-base-content/40 hover:text-base-content text-[10px] ml-1 px-1 rounded hover:bg-base-200"
                    title="Minimizar Eggder"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <h4 className="font-extrabold text-xs text-base-content leading-tight pt-0.5">
                {currentMsg.title}
              </h4>
              <p className="text-[10px] sm:text-[11px] text-base-content/70 leading-snug font-medium">
                {currentMsg.text}
              </p>

              {/* Bubble pointer pointing down towards avatar */}
              <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-base-100/95 border-b border-r border-primary/30 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Capsule Avatar */}
        <div className="relative flex items-center gap-2">
          {isMinimized && (
            <button
              onClick={() => setIsMinimized(false)}
              className="bg-base-100/90 border border-primary/30 text-primary font-bold text-xs px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md hover:bg-primary/10 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
              <span>Eggder</span>
            </button>
          )}

          <motion.div
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={cycleMood}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-primary/30 via-accent/30 to-secondary/30 p-1 flex items-center justify-center cursor-pointer shadow-xl border-2 border-primary/40 backdrop-blur-md relative group overflow-hidden"
          >
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-md group-hover:bg-primary/20 transition-all" />
            <Avatar
              mood={mood}
              size={100}
              className="w-14 h-14 sm:w-18 sm:h-18 relative z-10"
              alt="Eggder Copilot Flotante"
            />
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full max-w-[480px] lg:max-w-[540px] mx-auto min-h-[400px] sm:min-h-[460px] lg:min-h-[500px] flex items-center justify-center select-none pointer-events-auto overflow-visible ${className}`}
    >
      {/* BACKGROUND LAYER: Parallax Glow & Orbit Rings */}
      <motion.div
        style={{ x: bgX, y: bgY }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        {/* Main Ambient Radial Glows */}
        <div className="w-[280px] h-[280px] sm:w-[380px] sm:h-[380px] rounded-full bg-gradient-to-tr from-primary/25 via-accent/20 to-secondary/25 blur-3xl opacity-80 animate-pulse" />
        
        {/* Orbital Rings */}
        <div className="absolute w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] rounded-full border border-primary/10 border-dashed animate-[spin_60s_linear_infinite]" />
        <div className="absolute w-[240px] h-[240px] sm:w-[320px] sm:h-[320px] rounded-full border border-secondary/15 animate-[spin_40s_linear_infinite_reverse]" />
      </motion.div>

      {/* BOCADILLO DE DIÁLOGO EGGDERS (Speech Bubble - Top Right) */}
      <motion.div
        style={{ x: bubbleX, y: bubbleY }}
        animate={{ y: [0, -6, 0] }}
        transition={{ y: { duration: 4.0, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute -top-4 right-2 sm:right-6 lg:right-2 z-30"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={mood}
            initial={{ opacity: 0, y: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.92 }}
            transition={{ duration: 0.25 }}
            className="bg-base-100/95 border border-primary/30 shadow-2xl rounded-2xl p-3 sm:p-3.5 backdrop-blur-lg w-[200px] sm:w-[230px] space-y-1 relative"
          >
            {/* Top Copilot Badge */}
            <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-base-200/80">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black tracking-wider uppercase text-primary">
                  Eggder Copilot
                </span>
              </div>
              {currentMsg.icon}
            </div>

            <h4 className="font-extrabold text-xs text-base-content leading-tight pt-0.5">
              {currentMsg.title}
            </h4>
            <p className="text-[10px] sm:text-[11px] text-base-content/70 leading-snug font-medium">
              {currentMsg.text}
            </p>

            {/* Bubble arrow pointer */}
            <div className="absolute -bottom-1.5 left-6 w-3 h-3 bg-base-100/95 border-b border-r border-primary/30 rotate-45" />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* CENTER LAYER: PROTAGONIST AVATAR */}
      <motion.div
        style={{ x: avatarX, y: avatarY, rotate: avatarRotate }}
        className="relative z-10 flex flex-col items-center justify-center cursor-pointer group"
        onClick={cycleMood}
      >
        {/* Soft aura glow behind Eggder */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/30 via-accent/30 to-secondary/30 blur-2xl opacity-70 group-hover:opacity-100 transition-opacity" />

        {/* Avatar Render */}
        <motion.div
          animate={{ y: [0, -12, 0], scale: [1, 1.02, 1] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
          className="relative drop-shadow-2xl"
        >
          <Avatar
            mood={mood}
            size={280}
            className="w-56 h-56 sm:w-68 sm:h-68 lg:w-80 lg:h-80 transition-transform duration-300"
            alt="Eggder - Avatar Protagonista Nutringest"
          />
        </motion.div>

        {/* Ground Soft Shadow Effect */}
        <motion.div
          animate={{ scale: [0.85, 0.7, 0.85], opacity: [0.4, 0.2, 0.4] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
          className="w-40 sm:w-52 h-4 bg-black/30 rounded-[100%] blur-md mt-2 pointer-events-none"
        />
      </motion.div>
    </div>
  );
}
