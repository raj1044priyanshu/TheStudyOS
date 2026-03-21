"use client";

import { Dialog } from "@/components/ui/dialog";
import { STUDY_STYLE_RECOMMENDATIONS, WORKFLOW_TOOL_GROUPS } from "@/lib/study-flow";
import type { StudyStyle } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  studyStyle?: StudyStyle | "";
}

export function StudyWorkflowModal({ open, onClose, studyStyle = "mixed" }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Your Study Workflow"
      description="StudyOS is designed as a connected system. Each feature feeds the next one instead of living alone."
      size="xl"
      bodyClassName="space-y-6"
    >
      <div className="grid gap-4 lg:grid-cols-5">
        {WORKFLOW_TOOL_GROUPS.map((group, index) => (
          <div key={group.phase} className="relative rounded-[24px] border border-[color:var(--panel-border)] bg-[color:var(--surface-low)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">{group.title}</p>
            <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">{group.subtitle}</h3>
            <div className="mt-4 space-y-2">
              {group.tools.map((tool) => (
                <div key={tool} className="rounded-full bg-[color:var(--surface-high)] px-3 py-2 text-sm text-[var(--foreground)]">
                  {tool}
                </div>
              ))}
            </div>
            {index < WORKFLOW_TOOL_GROUPS.length - 1 ? (
              <span className="absolute -right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-[#7B6CF6] px-2 py-1 text-xs text-white lg:block">
                Then
              </span>
            ) : null}
          </div>
        ))}
      </div>

      <div className="surface-card rounded-[24px] p-5">
        <p className="text-sm font-medium text-[var(--foreground)]">Recommended starting workflow</p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
          {STUDY_STYLE_RECOMMENDATIONS[studyStyle || "mixed"]}
        </p>
      </div>
    </Dialog>
  );
}
