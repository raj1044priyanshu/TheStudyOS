"use client";

import { CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SUBJECT_COLOR_VALUES } from "@/lib/constants";

interface Props {
  subjectBreakdown: { subject: string; minutes: number }[];
  quizTimeline: { date: string; score: number }[];
}

function stableDateLabel(value: string) {
  return value.slice(5, 10);
}

export function ProgressCharts({ subjectBreakdown, quizTimeline }: Props) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="glass-card h-80 p-5">
        <div className="mb-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Distribution</p>
          <h3 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Subject breakdown</h3>
        </div>
        <ResponsiveContainer width="100%" height="78%">
          <PieChart>
            <Pie data={subjectBreakdown} dataKey="minutes" nameKey="subject" innerRadius={54} outerRadius={96} paddingAngle={3}>
              {subjectBreakdown.map((entry) => (
                <Cell key={entry.subject} fill={SUBJECT_COLOR_VALUES[entry.subject] ?? SUBJECT_COLOR_VALUES.Other} />
              ))}
            </Pie>
            <Legend wrapperStyle={{ color: "var(--muted-foreground)", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                borderRadius: 16,
                border: "1px solid var(--tooltip-border)",
                background: "var(--tooltip-bg)",
                boxShadow: "var(--tooltip-shadow)"
              }}
              labelStyle={{ color: "var(--foreground)" }}
              itemStyle={{ color: "var(--muted-foreground)" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card h-80 p-5">
        <div className="mb-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Timeline</p>
          <h3 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Quiz scores</h3>
        </div>
        <ResponsiveContainer width="100%" height="78%">
          <LineChart data={quizTimeline}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="date" tickFormatter={stableDateLabel} tick={{ fontSize: 12, fill: "var(--chart-axis)" }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--chart-axis)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: 16,
                border: "1px solid var(--tooltip-border)",
                background: "var(--tooltip-bg)",
                boxShadow: "var(--tooltip-shadow)"
              }}
              labelStyle={{ color: "var(--foreground)" }}
              itemStyle={{ color: "var(--muted-foreground)" }}
            />
            <Line type="monotone" dataKey="score" stroke="#7B6CF6" strokeWidth={3} dot={{ r: 4, fill: "#7B6CF6" }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
