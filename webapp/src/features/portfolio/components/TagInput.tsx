"use client";

import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  maxTagLength?: number;
  disabled?: boolean;
}

export function TagInput({
  value = [],
  onChange,
  placeholder = "Escribí un servicio y presioná Enter",
  maxTags = 10,
  maxTagLength = 100,
  disabled = false,
}: TagInputProps) {
  const [input, setInput] = useState("");

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (trimmed.length > maxTagLength) return;
    if (value.length >= maxTags) return;
    if (value.some((t) => t.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...value, trimmed]);
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(input);
      setInput("");
    }
    if (e.key === ",") {
      e.preventDefault();
      addTag(input);
      setInput("");
    }
    if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
      {value.map((tag, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-sm font-semibold border border-emerald-200"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            disabled={disabled}
            className="text-emerald-500 hover:text-emerald-700 transition-colors cursor-pointer border-0 bg-transparent p-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (input) {
            addTag(input);
            setInput("");
          }
        }}
        placeholder={value.length >= maxTags ? "Límite alcanzado" : placeholder}
        disabled={disabled || value.length >= maxTags}
        className="flex-1 min-w-[140px] bg-transparent border-0 outline-none text-sm placeholder:text-slate-400 disabled:opacity-50 p-0"
      />
      {value.length > 0 && (
        <span className="text-xs text-slate-400 font-medium ml-auto">
          {value.length}/{maxTags}
        </span>
      )}
    </div>
  );
}
