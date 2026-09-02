"use client";

import { cn } from "@/lib/utils";

type ChildAvatarProps = {
  name: string;
  color?: string | null;
  emoji?: string | null;
  selected?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg" | "xl";
};

const AVATAR_EMOJIS: Record<string, string> = {
  a: "🦊", b: "🐻", c: "🐱", d: "🐶", e: "🦄",
  f: "🐸", g: "🦁", h: "🐹", i: "🦋", j: "🐰",
  k: "🐨", l: "🦎", m: "🐵", n: "🦉", o: "🐙",
  p: "🐼", q: "🦆", r: "🐯", s: "🐍", t: "🐢",
  u: "🦈", v: "🦅", w: "🐺", x: "🦀", y: "🐝", z: "🦓",
};

function getAvatarEmoji(name: string) {
  const first = name.charAt(0).toLowerCase();
  return AVATAR_EMOJIS[first] || "🌟";
}

export function ChildAvatar({
  name,
  color = "#3b82f6",
  emoji,
  selected,
  onClick,
  size = "md",
}: ChildAvatarProps) {
  const bgColor = color || "#3b82f6";
  const displayEmoji = emoji || getAvatarEmoji(name);
  const sizes = {
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-lg",
    lg: "h-14 w-14 text-2xl",
    xl: "h-20 w-20 text-4xl",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl font-bold flex items-center justify-center transition-all shadow-sm",
        sizes[size],
        selected && "ring-3 ring-offset-2 ring-ring scale-110 shadow-lg",
        onClick && "cursor-pointer hover:scale-105 active:scale-95"
      )}
      style={{
        backgroundColor: bgColor,
        boxShadow: selected ? `0 4px 14px ${bgColor}66` : undefined,
      }}
      title={name}
    >
      <span className="drop-shadow-sm">{displayEmoji}</span>
    </button>
  );
}
