"use client";

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
    mouth: string;
    leftArm: string;
    rightArm: string;
    leftBrow?: string;
    rightBrow?: string;
    accessoryLeft: string;
    accessoryRight: string;
  }
> = {
  wave: {
    rotate: -6,
    y: -4,
    mouth: "M 62 98 Q 80 112 98 98",
    leftArm: "M 34 78 Q 8 50 20 34",
    rightArm: "M 126 78 Q 146 52 138 30",
    accessoryLeft: "translate(-6px, -8px)",
    accessoryRight: "translate(6px, -10px)"
  },
  cheer: {
    rotate: 0,
    y: -8,
    mouth: "M 58 95 Q 80 119 102 95",
    leftArm: "M 34 76 Q 10 30 30 18",
    rightArm: "M 126 76 Q 150 30 130 18",
    accessoryLeft: "translate(-8px, -16px)",
    accessoryRight: "translate(10px, -14px)"
  },
  sparkle: {
    rotate: 4,
    y: -6,
    mouth: "M 60 97 Q 80 109 100 97",
    leftArm: "M 34 80 Q 10 58 18 42",
    rightArm: "M 126 80 Q 144 58 142 38",
    accessoryLeft: "translate(-10px, -14px)",
    accessoryRight: "translate(10px, -18px)"
  },
  "sad-but-supportive": {
    rotate: -3,
    y: 2,
    mouth: "M 62 104 Q 80 92 98 104",
    leftArm: "M 34 82 Q 14 88 18 104",
    rightArm: "M 126 82 Q 146 88 142 104",
    leftBrow: "M 61 72 Q 69 66 76 70",
    rightBrow: "M 84 70 Q 91 66 99 72",
    accessoryLeft: "translate(-6px, 6px)",
    accessoryRight: "translate(8px, 4px)"
  },
  thinking: {
    rotate: 5,
    y: -2,
    mouth: "M 70 99 Q 80 103 90 99",
    leftArm: "M 34 80 Q 12 70 20 56",
    rightArm: "M 126 80 Q 136 88 132 102",
    leftBrow: "M 60 69 Q 69 64 76 68",
    rightBrow: "M 85 68 Q 92 64 101 69",
    accessoryLeft: "translate(-12px, -10px)",
    accessoryRight: "translate(4px, -20px)"
  },
  "sleepy-focus": {
    rotate: -2,
    y: 1,
    mouth: "M 66 99 Q 80 104 94 99",
    leftArm: "M 34 80 Q 12 84 16 98",
    rightArm: "M 126 80 Q 148 84 144 98",
    leftBrow: "M 58 71 Q 68 74 76 70",
    rightBrow: "M 84 70 Q 92 74 102 71",
    accessoryLeft: "translate(-8px, 0px)",
    accessoryRight: "translate(8px, -6px)"
  }
};

function Star({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("h-4 w-4 text-[color:var(--brand-500)]", className)}
      fill="currentColor"
    >
      <path d="M12 1.5l2.5 6.1 6.4 1-4.7 4.5 1.1 6.4L12 16.7 6.7 19.5l1.1-6.4L3.1 8.6l6.4-1L12 1.5z" />
    </svg>
  );
}

function Dot({ className }: { className?: string }) {
  return <span className={cn("block h-2.5 w-2.5 rounded-full bg-[color:var(--accent-500)]", className)} aria-hidden="true" />;
}

export function StudyCompanion({ pose = "wave", className, size = 148, compact = false }: StudyCompanionProps) {
  const config = poseConfig[pose];
  const eyeShape = pose === "sleepy-focus" ? 1.5 : 6;
  const accessoryClassName = compact ? "h-3 w-3" : "h-4 w-4";

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
        StudyOS
      </motion.div>

      <motion.div
        className="absolute left-[14%] top-[12%]"
        animate={{ transform: [config.accessoryLeft, "translate(-2px, -2px)", config.accessoryLeft] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Star className={accessoryClassName} />
      </motion.div>

      <motion.div
        className="absolute right-[14%] top-[18%]"
        animate={{ transform: [config.accessoryRight, "translate(2px, -2px)", config.accessoryRight] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <Dot className={compact ? "h-2 w-2" : "h-2.5 w-2.5"} />
      </motion.div>

      <svg viewBox="0 0 160 160" aria-hidden="true" className="h-full w-full overflow-visible">
        <ellipse cx="80" cy="132" rx="46" ry="12" fill="var(--companion-shadow)" />

        <path
          d={config.leftArm}
          fill="none"
          stroke="var(--companion-ink)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
        <path
          d={config.rightArm}
          fill="none"
          stroke="var(--companion-ink)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />

        <rect x="38" y="34" width="84" height="92" rx="28" fill="var(--companion-shell)" stroke="var(--companion-ink)" strokeWidth="5" />
        <rect x="49" y="44" width="62" height="72" rx="18" fill="var(--companion-page)" />
        <path d="M 55 62 H 105" stroke="var(--companion-page-line)" strokeWidth="4" strokeLinecap="round" />
        <path d="M 55 78 H 101" stroke="var(--companion-page-line)" strokeWidth="4" strokeLinecap="round" />
        <path d="M 55 94 H 97" stroke="var(--companion-page-line)" strokeWidth="4" strokeLinecap="round" />

        <path
          d="M 73 28 C 70 18, 86 12, 94 24 C 98 12, 114 16, 109 30 C 104 42, 86 46, 73 28 Z"
          fill="var(--companion-ribbon)"
          stroke="var(--companion-ink)"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {config.leftBrow ? <path d={config.leftBrow} fill="none" stroke="var(--companion-ink)" strokeWidth="4" strokeLinecap="round" /> : null}
        {config.rightBrow ? <path d={config.rightBrow} fill="none" stroke="var(--companion-ink)" strokeWidth="4" strokeLinecap="round" /> : null}

        <ellipse cx="66" cy="82" rx="5" ry={eyeShape} fill="var(--companion-ink)" />
        <ellipse cx="94" cy="82" rx="5" ry={eyeShape} fill="var(--companion-ink)" />
        <circle cx="56" cy="92" r="5" fill="var(--companion-cheek)" opacity="0.65" />
        <circle cx="104" cy="92" r="5" fill="var(--companion-cheek)" opacity="0.65" />
        <path d={config.mouth} fill="none" stroke="var(--companion-ink)" strokeWidth="4.5" strokeLinecap="round" />
      </svg>
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
