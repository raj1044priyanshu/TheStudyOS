"use client";

interface AchievementToastProps {
  icon: string;
  name: string;
  xp: number;
  color: string;
}

export function AchievementToast({ icon, name, xp, color }: AchievementToastProps) {
  return (
    <div className="glass-card min-w-[280px] max-w-sm rounded-[24px] border border-[color:var(--panel-border)] p-4 shadow-[var(--glass-shadow-deep)]">
      <div className="flex items-center gap-3">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-[20px] text-[1.75rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
          style={{ backgroundColor: `${color}22`, color }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--tertiary-foreground)]">Achievement Unlocked!</p>
          <p className="truncate text-base font-semibold text-[var(--foreground)]">{name}</p>
        </div>
        <span
          className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
          style={{ backgroundColor: `${color}18`, color }}
        >
          +{xp} XP
        </span>
      </div>
    </div>
  );
}
