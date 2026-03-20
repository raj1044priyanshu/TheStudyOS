"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import toast from "react-hot-toast";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/EmptyState";
import { SUBJECTS } from "@/lib/constants";

interface PastPaperRecord {
  _id: string;
  fileName: string;
  subject: string;
  year: number;
  examBoard: string;
  questions: Array<{ questionText: string; topic: string; difficulty: string; marks: number; questionType: string }>;
  topicFrequency: Array<{ topic: string; count: number; percentage: number }>;
  predictedTopics: Array<{ topic: string; confidence: number; reason: string }>;
  practiceQuestions: Array<{ question: string; modelAnswer: string; marks: number; topic: string }>;
  examInsights?: {
    totalQuestions: number;
    totalMarks: number;
    difficultyBreakdown: Record<string, number>;
    mostTestedTopic: string;
    leastTestedTopic: string;
  };
}

export function PastPapersPage() {
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("Mathematics");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [examBoard, setExamBoard] = useState("CBSE");
  const [loading, setLoading] = useState(false);
  const [papers, setPapers] = useState<PastPaperRecord[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<PastPaperRecord | null>(null);
  const [tab, setTab] = useState<"analysis" | "predicted" | "questions" | "practice">("analysis");
  const [questionFilter, setQuestionFilter] = useState("");

  async function load() {
    const response = await fetch("/api/past-papers", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) {
      setPapers(data.papers ?? []);
      if (!selectedPaper && data.papers?.length) {
        setSelectedPaper(data.papers[0]);
      }
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredQuestions = useMemo(() => {
    return (selectedPaper?.questions ?? []).filter((question) => {
      return !questionFilter || question.topic.toLowerCase().includes(questionFilter.toLowerCase());
    });
  }, [selectedPaper, questionFilter]);

  async function uploadPaper() {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("pdf", file);
    formData.append("subject", subject);
    formData.append("year", year);
    formData.append("examBoard", examBoard);
    const response = await fetch("/api/past-papers/analyze", { method: "POST", body: formData });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      toast.error(data.error ?? "Could not analyze this paper");
      return;
    }
    setSelectedPaper(data.paper);
    await load();
    toast.success("Past paper analyzed");
  }

  async function generatePractice() {
    if (!selectedPaper) return;
    const response = await fetch(`/api/past-papers/${selectedPaper._id}/generate-practice`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? "Could not generate practice questions");
      return;
    }
    setSelectedPaper((prev) => (prev ? { ...prev, practiceQuestions: data.questions ?? [] } : prev));
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
      <aside className="glass-card space-y-4 p-4">
        <div className="space-y-3">
          <Input type="file" accept="application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          <Select value={subject} onChange={(event) => setSubject(event.target.value)}>
            {SUBJECTS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Input value={year} onChange={(event) => setYear(event.target.value)} placeholder="Year" />
          <Input value={examBoard} onChange={(event) => setExamBoard(event.target.value)} placeholder="Exam board" />
          <Button onClick={() => void uploadPaper()} disabled={!file || loading} className="w-full">
            {loading ? "Analyzing paper..." : "Analyze Paper"}
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-[var(--foreground)]">Your Papers</p>
          {papers.map((paper) => (
            <button
              key={paper._id}
              type="button"
              onClick={() => setSelectedPaper(paper)}
              className={`block w-full rounded-[20px] p-4 text-left ${selectedPaper?._id === paper._id ? "bg-[#7B6CF6] text-white" : "surface-card text-[var(--foreground)]"}`}
            >
              <p className="font-semibold">{paper.subject}</p>
              <p className="mt-1 text-sm opacity-80">{paper.year} • {paper.examBoard}</p>
              <p className="mt-1 text-xs opacity-70">{paper.questions.length} questions</p>
            </button>
          ))}
        </div>
      </aside>

      <div className="space-y-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Pattern Analysis</p>
          <h2 className="mt-2 font-headline text-4xl tracking-[-0.04em] text-[var(--foreground)] sm:text-6xl">Past Papers</h2>
          <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
            Upload a paper, break it into topic frequency and question styles, then generate follow-up practice questions in the same spirit.
          </p>
        </div>

        {!selectedPaper ? (
          <EmptyState title="No past paper loaded" description="Upload a PDF to begin topic analysis and practice generation." />
        ) : (
          <>
            <div className="glass-card flex flex-wrap gap-2 p-4">
              {[
                ["analysis", "📊 Topic Analysis"],
                ["predicted", "🎯 Predicted Topics"],
                ["questions", "📋 All Questions"],
                ["practice", "✏️ Practice Questions"]
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key as typeof tab)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium ${tab === key ? "border-transparent bg-[#7B6CF6] text-white" : "border-[color:var(--panel-border)] text-[var(--muted-foreground)]"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "analysis" ? (
              <div className="glass-card space-y-5 p-5">
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={selectedPaper.topicFrequency}>
                      <XAxis dataKey="topic" hide />
                      <YAxis />
                      <Bar dataKey="count" fill="#7B6CF6" radius={[10, 10, 10, 10]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {selectedPaper.topicFrequency.map((item) => (
                    <div key={item.topic} className="surface-card rounded-[20px] p-4">
                      <p className="font-semibold text-[var(--foreground)]">{item.topic}</p>
                      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                        {item.count} questions • {item.percentage}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {tab === "predicted" ? (
              selectedPaper.predictedTopics.length >= 3 ? (
                <div className="grid gap-4">
                  {selectedPaper.predictedTopics.map((topic) => (
                    <div key={topic.topic} className="glass-card rounded-[24px] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-headline text-[2rem] text-[var(--foreground)]">{topic.topic}</p>
                        <span className="rounded-full bg-[#34D399]/12 px-3 py-1 text-xs font-medium text-[#047857]">{topic.confidence}% confidence</span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-[color:var(--surface-low)]">
                        <div className="h-full rounded-full bg-[#34D399]" style={{ width: `${topic.confidence}%` }} />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{topic.reason}</p>
                      <Link href={`/notes?topic=${encodeURIComponent(topic.topic)}&subject=${encodeURIComponent(selectedPaper.subject)}`} className="mt-4 inline-flex text-sm font-medium text-[#7B6CF6]">
                        📝 Generate Notes for This Topic
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="Not enough data to predict topics" description="Upload more past papers to build stronger topic predictions." />
              )
            ) : null}

            {tab === "questions" ? (
              <div className="space-y-4">
                <Input value={questionFilter} onChange={(event) => setQuestionFilter(event.target.value)} placeholder="Filter by topic" className="max-w-sm" />
                <div className="grid gap-3">
                  {filteredQuestions.map((question, index) => (
                    <div key={`${question.questionText}-${index}`} className="glass-card rounded-[24px] p-5">
                      <p className="text-[var(--foreground)]">{question.questionText}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-[#7B6CF6]/12 px-3 py-1 text-[#7B6CF6]">{question.topic}</span>
                        <span className="rounded-full bg-[color:var(--surface-low)] px-3 py-1 text-[var(--muted-foreground)]">{question.difficulty}</span>
                        <span className="rounded-full bg-[color:var(--surface-low)] px-3 py-1 text-[var(--muted-foreground)]">{question.marks} marks</span>
                        <span className="rounded-full bg-[color:var(--surface-low)] px-3 py-1 text-[var(--muted-foreground)]">{question.questionType}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {tab === "practice" ? (
              <div className="space-y-4">
                {!selectedPaper.practiceQuestions.length ? (
                  <Button onClick={() => void generatePractice()}>Generate Practice Questions in Same Style</Button>
                ) : (
                  selectedPaper.practiceQuestions.map((question, index) => (
                    <details key={`${question.question}-${index}`} className="glass-card rounded-[24px] p-5" open={index === 0}>
                      <summary className="cursor-pointer font-semibold text-[var(--foreground)]">
                        {index + 1}. {question.question}
                      </summary>
                      <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                        {question.topic} • {question.marks} marks
                      </p>
                      <p className="mt-4 text-sm leading-7 text-[var(--foreground)]">{question.modelAnswer}</p>
                    </details>
                  ))
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
