"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type CompanionPose =
  | "wave"
  | "cheer"
  | "sparkle"
  | "sad-but-supportive"
  | "thinking"
  | "sleepy-focus";

interface StudyCompanionProps {
  pose?: CompanionPose;
  className?: string;
  size?: number;
  compact?: boolean;
}

const poseConfig: Record<
  CompanionPose,
  {
    rotate: number;
    y: number;
    asset: string;
    badge: string;
  }
> = {
  wave: {
    rotate: -6,
    y: -4,
    asset: "/mascot-default.svg",
    badge: "Study buddy"
  },
  cheer: {
    rotate: 0,
    y: -8,
    asset: "/mascot-celebrate.svg",
    badge: "Great work"
  },
  sparkle: {
    rotate: 4,
    y: -6,
    asset: "/mascot-celebrate.svg",
    badge: "StudyOS"
  },
  "sad-but-supportive": {
    rotate: -3,
    y: 2,
    asset: "/mascot-thinking.svg",
    badge: "Still with you"
  },
  thinking: {
    rotate: 5,
    y: -2,
    asset: "/mascot-thinking.svg",
    badge: "Thinking"
  },
  "sleepy-focus": {
    rotate: -2,
    y: 1,
    asset: "/mascot-thinking.svg",
    badge: "Focus mode"
  }
};

export function StudyCompanion({ pose = "wave", className, size = 148, compact = false }: StudyCompanionProps) {
  const config = poseConfig[pose];

  return (
    <motion.div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      animate={{
        y: [0, config.y, 0],
        rotate: [config.rotate, config.rotate + 1.5, config.rotate]
      }}
      transition={{
        duration: compact ? 4.2 : 5.2,
        ease: "easeInOut",
        repeat: Infinity
      }}
      style={{ width: size, height: size }}
    >
      <motion.div
        className="absolute left-[10%] top-[7%] rounded-full bg-[color:var(--brand-soft)]/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--brand-700)] shadow-[0_8px_20px_rgba(0,0,0,0.08)]"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3.1, repeat: Infinity, ease: "easeInOut" }}
      >
        {compact ? "StudyOS" : config.badge}
      </motion.div>

      <div className="relative h-full w-full overflow-hidden rounded-[28%]">
        <Image
          src={config.asset}
          alt=""
          fill
          sizes={`${size}px`}
          priority={size >= 120}
          className="object-contain drop-shadow-[0_18px_30px_rgba(92,67,75,0.18)]"
        />
      </div>
    </motion.div>
  );
}

interface CompanionPanelProps {
  pose?: CompanionPose;
  eyebrow?: string;
  title: string;
  description: string;
  className?: string;
  compact?: boolean;
}

export function CompanionPanel({
  pose = "wave",
  eyebrow = "StudyOS",
  title,
  description,
  className,
  compact = false
}: CompanionPanelProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-[28px] border border-[color:var(--panel-border)] bg-[color:var(--hero-panel)] p-5 shadow-[var(--glass-shadow)]", className)}>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--brand-300)_44%,transparent),transparent_62%)]" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <StudyCompanion pose={pose} size={compact ? 110 : 136} compact={compact} />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-700)]">{eyebrow}</p>
          <h3 className="mt-2 font-headline text-[clamp(1.8rem,4vw,2.6rem)] tracking-[-0.04em] text-[var(--foreground)]">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
        </div>
      </div>
    </div>
  );
}

interface CompanionBadgeProps {
  pose?: CompanionPose;
  className?: string;
  size?: number;
}

export function CompanionBadge({ pose = "sparkle", className, size = 72 }: CompanionBadgeProps) {
  return (
    <div className={cn("inline-flex rounded-[24px] border border-[color:var(--panel-border)] bg-[color:var(--surface-panel-strong)] p-1.5 shadow-[var(--panel-shadow)]", className)}>
      <StudyCompanion pose={pose} size={size} compact />
    </div>
  );
}
