"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ReactCrop, { type Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import heic2any from "heic2any";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { NextStepCard } from "@/components/shared/NextStepCard";
import { queueCelebrationsFromGamification } from "@/lib/client-celebrations";
import { getHubHref } from "@/lib/hubs";

interface ScanAnalysis {
  _id: string;
  imageUrl: string;
  transcription: string;
  subject: string;
  topic: string;
  summary: string;
  explanation: string;
  concepts: Array<{ name: string; explanation: string }>;
  errors: Array<{ originalText: string; correction: string; type: string }>;
}

async function fileFromSelection(file: File) {
  if (file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic")) {
    const converted = (await heic2any({ blob: file, toType: "image/jpeg" })) as Blob;
    return new File([converted], file.name.replace(/\.heic$/i, ".jpg"), { type: "image/jpeg" });
  }
  return file;
}

async function cropToFile(image: HTMLImageElement, file: File, crop: Crop) {
  if (!crop.width || !crop.height) {
    return file;
  }
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise<File>((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(file);
        return;
      }
      resolve(new File([blob], file.name, { type: "image/jpeg" }));
    }, "image/jpeg", 0.95);
  });
}

export function Scanner() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [crop, setCrop] = useState<Crop>({ unit: "%", x: 10, y: 10, width: 80, height: 80 });
  const [rotation, setRotation] = useState(0);
  const [analysis, setAnalysis] = useState<ScanAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<"transcription" | "concepts" | "errors" | "summary">("transcription");
  const [loading, setLoading] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  async function onFileChange(selected?: File) {
    if (!selected) return;
    if (selected.size > 10 * 1024 * 1024) {
      toast.error("File too large. Max 10MB.");
      return;
    }
    const normalized = await fileFromSelection(selected);
    setFile(normalized);
    setPreview(URL.createObjectURL(normalized));
    setAnalysis(null);
    setSavedMessage("");
  }

  async function analyze() {
    if (!file) return;
    setLoading(true);
    setSavedMessage("");
    try {
      const payloadFile = imageRef.current ? await cropToFile(imageRef.current, file, crop) : file;
      const formData = new FormData();
      formData.append("file", payloadFile);
      const response = await fetch("/api/scanner", {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not analyze this image");
      }
      setAnalysis(data);
      queueCelebrationsFromGamification(data.events, "scanner");
      setActiveTab(data.errors?.length ? "errors" : "transcription");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not analyze this image");
    } finally {
      setLoading(false);
    }
  }

  async function convertToNote() {
    if (!analysis?._id) return;
    const response = await fetch(`/api/scanner/${analysis._id}/convert`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? "Could not convert scan");
      return;
    }
    router.push(`/dashboard/notes/${data.noteId}`);
  }

  const tabs = [
    { key: "transcription", label: "Transcription" },
    { key: "concepts", label: "Concepts" },
    ...(analysis?.errors?.length ? [{ key: "errors", label: "Errors" }] : []),
    { key: "summary", label: "Summary" }
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Capture</p>
        <h2 className="mt-2 font-headline text-[clamp(2rem,5vw,3rem)] tracking-[-0.04em] text-[var(--foreground)]">Scanner</h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
          Photograph notes, textbook pages, or handwritten work and turn them into searchable transcription, concepts, and corrections.
        </p>
      </div>

      {!analysis ? (
        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="glass-card space-y-4 p-6">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="surface-dashed flex min-h-[260px] w-full flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-[color:var(--panel-border)] px-6 text-center"
            >
              <p className="text-lg font-semibold text-[var(--foreground)]">Drag a photo here or choose one</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">JPG, PNG, WEBP, or HEIC. Up to 10MB.</p>
            </button>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                Take Photo
              </Button>
              <Button onClick={() => void analyze()} disabled={!file || loading}>
                {loading ? "Reading your notes..." : "Analyze"}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => void onFileChange(event.target.files?.[0])}
            />
          </div>

          <div className="glass-card space-y-4 p-6">
            {preview ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setRotation((value) => value - 90)}>
                    Rotate Left
                  </Button>
                  <Button variant="outline" onClick={() => setRotation((value) => value + 90)}>
                    Rotate Right
                  </Button>
                </div>
                <div className="relative overflow-hidden rounded-[24px] bg-[color:var(--surface-low)] p-3">
                  {loading ? <div className="absolute inset-x-0 top-0 h-1 animate-[scanner_1.8s_linear_infinite] bg-[#7B6CF6]" /> : null}
                  <ReactCrop crop={crop} onChange={(next) => setCrop(next)}>
                    <Image
                      src={preview}
                      alt="Scan preview"
                      width={960}
                      height={1280}
                      unoptimized
                      onLoad={(event) => {
                        imageRef.current = event.currentTarget as HTMLImageElement;
                      }}
                      className="max-h-[460px] w-full rounded-[18px] object-contain"
                      style={{ transform: `rotate(${rotation}deg)` }}
                    />
                  </ReactCrop>
                </div>
              </>
            ) : (
              <EmptyState title="No image selected" description="Choose a page first, then crop or rotate it before analysis." />
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="glass-card overflow-hidden p-4">
            <div className="relative overflow-hidden rounded-[24px] bg-[color:var(--surface-low)] p-3">
              <Image src={analysis.imageUrl} alt={analysis.topic} width={900} height={1200} className="h-auto w-full rounded-[18px] object-contain" />
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as "transcription" | "concepts" | "errors" | "summary")}
                  className={`rounded-full border px-4 py-2 text-sm font-medium ${activeTab === tab.key ? "border-transparent bg-[#7B6CF6] text-white" : "border-[color:var(--panel-border)] text-[var(--muted-foreground)]"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-5">
              {activeTab === "transcription" ? (
                <pre className="whitespace-pre-wrap rounded-[24px] bg-[color:var(--surface-low)] p-4 font-mono text-sm text-[var(--foreground)]">{analysis.transcription}</pre>
              ) : null}

              {activeTab === "concepts" ? (
                <div className="space-y-3">
                  {analysis.concepts.map((concept) => (
                    <details key={concept.name} className="surface-card rounded-[22px] p-4" open>
                      <summary className="cursor-pointer font-semibold text-[var(--foreground)]">{concept.name}</summary>
                      <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{concept.explanation}</p>
                    </details>
                  ))}
                </div>
              ) : null}

              {activeTab === "errors" ? (
                <div className="space-y-3">
                  {analysis.errors.length ? (
                    analysis.errors.map((error, index) => (
                      <div key={`${error.originalText}-${index}`} className="surface-card rounded-[22px] p-4">
                        <p className="text-sm text-[#B91C1C] line-through">{error.originalText}</p>
                        <p className="mt-2 text-sm leading-6 text-[#047857]">{error.correction}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--muted-foreground)]">No errors found.</p>
                  )}
                </div>
              ) : null}

              {activeTab === "summary" ? (
                <div className="surface-card rounded-[24px] p-5 text-sm leading-7 text-[var(--foreground)]">{analysis.summary}</div>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => void convertToNote()}>Convert to StudyOS Note</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSavedMessage("Saved scan");
                  toast.success("Scan saved");
                }}
              >
                Save Scan
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setAnalysis(null);
                  setFile(null);
                  setPreview("");
                  setSavedMessage("");
                }}
              >
                Discard
              </Button>
            </div>
            {savedMessage ? <p className="mt-3 text-sm text-[#0F766E]">{savedMessage}</p> : null}

            <div className="mt-5">
              <NextStepCard
                suggestions={[
                  {
                    icon: "",
                    title: "Convert this scan into a StudyOS note",
                    description: "Turn the page into a reusable note so it joins the rest of your study system.",
                    action: "convert_scan"
                  },
                  {
                    icon: "",
                    title: "Ask a doubt about this page",
                    description: "Pick one unclear concept from the scan and get a focused explanation next.",
                    href: `${getHubHref("study", "doubts")}&subject=${encodeURIComponent(analysis.subject)}`
                  }
                ]}
                onAction={(action) => {
                  if (action === "convert_scan") {
                    return convertToNote();
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
