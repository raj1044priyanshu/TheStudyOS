"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { IconCamera, IconDeviceFloppy, IconMail, IconRefresh, IconUserCircle } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";

interface ProfilePayload {
  id: string;
  name: string;
  email: string;
  image: string | null;
  timezone: string;
  createdAt: string | null;
}

interface AchievementDefinition {
  id: string;
  name: string;
  icon: string;
  desc: string;
  color: string;
  xp: number;
}

interface AchievementRecord {
  achievementId?: string;
  type?: string;
  unlockedAt?: string;
}

interface AchievementsPayload {
  achievements: AchievementRecord[];
  definitions: AchievementDefinition[];
  progress: {
    currentXp: number;
    currentLevel: number;
    levelName: string;
    levelIcon: string;
    progressToNextLevel: number;
  };
}

interface ProfileStatsPayload {
  stats: {
    totalNotes: number;
    totalQuizzes: number;
    totalFocusSessions: number;
    totalScans: number;
    totalEvaluations: number;
    totalStudyTime: number;
    mostStudiedSubject: string;
    averageQuizScore: number;
  };
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [achievements, setAchievements] = useState<AchievementsPayload | null>(null);
  const [stats, setStats] = useState<ProfileStatsPayload["stats"] | null>(null);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all");

  useEffect(() => {
    async function load() {
      const [profileResponse, achievementResponse, statsResponse] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/achievements"),
        fetch("/api/profile/stats")
      ]);

      const profileData = await profileResponse.json();
      const achievementData = await achievementResponse.json();
      const statsData = await statsResponse.json();

      if (!profileResponse.ok) {
        toast.error(profileData.error ?? "Unable to load profile");
        return;
      }

      const loaded = profileData.profile as ProfilePayload;
      setProfile(loaded);
      setAchievements(achievementData as AchievementsPayload);
      setStats((statsData as ProfileStatsPayload).stats);
      setName(loaded.name);
      setTimezone(loaded.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
      setImagePreview(loaded.image);
    }

    void load();
  }, []);

  const changed = useMemo(() => {
    if (!profile) return false;
    const nameChanged = name.trim() !== profile.name;
    const timezoneChanged = timezone.trim() !== profile.timezone;
    const imageChanged = Boolean(imageBase64);
    return nameChanged || imageChanged || timezoneChanged;
  }, [profile, name, timezone, imageBase64]);

  const unlockedIds = useMemo(
    () => new Set((achievements?.achievements ?? []).map((item) => item.achievementId ?? item.type ?? "")),
    [achievements]
  );

  const visibleDefinitions = useMemo(() => {
    const definitions = achievements?.definitions ?? [];
    if (filter === "unlocked") {
      return definitions.filter((item) => unlockedIds.has(item.id));
    }
    if (filter === "locked") {
      return definitions.filter((item) => !unlockedIds.has(item.id));
    }
    return definitions;
  }, [achievements, filter, unlockedIds]);

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Please use an image under 4MB");
      return;
    }
    const base64 = await fileToBase64(file);
    setImageBase64(base64);
    setImagePreview(base64);
  }

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        imageBase64: imageBase64 ?? undefined,
        timezone: timezone.trim()
      })
    });

    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      toast.error(data.error ?? "Unable to save profile");
      return;
    }

    setProfile(data.profile);
    setName(data.profile.name);
    setTimezone(data.profile.timezone);
    setImageBase64(null);
    setImagePreview(data.profile.image);
    toast.success("Profile updated");
  }

  async function restartTour() {
    const response = await fetch("/api/tour/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" })
    });

    if (!response.ok) {
      toast.error("Could not restart tour");
      return;
    }

    toast.success("Tour restarted");
    router.push("/dashboard");
    router.refresh();
  }

  if (!profile || !achievements || !stats) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44" />
        <Skeleton className="h-56" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-card grid gap-5 p-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt={name}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-[24px] border border-[color:var(--panel-border)] object-cover shadow-[var(--panel-shadow)]"
                />
              ) : (
                <Avatar src={profile.image} alt={profile.name} />
              )}
              <label className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#7B6CF6] text-white shadow-lg">
                <IconCamera className="h-4 w-4" />
                <input type="file" accept="image/*" className="hidden" onChange={(event) => void onFileChange(event)} />
              </label>
            </div>
            <div className="min-w-0">
              <p className="font-headline text-4xl tracking-[-0.04em] text-[var(--foreground)]">{profile.name}</p>
              <p className="text-sm text-[var(--muted-foreground)]">{profile.email}</p>
            </div>
          </div>

          <div className="rounded-[24px] border border-[color:var(--panel-border)] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Level</p>
                <p className="font-headline text-[2rem] text-[var(--foreground)]">
                  {achievements.progress.levelIcon} {achievements.progress.levelName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[var(--muted-foreground)]">Total XP</p>
                <p className="text-xl font-semibold text-[var(--foreground)]">{achievements.progress.currentXp}</p>
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-[color:var(--surface-low)]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#7B6CF6,#6EE7B7)]"
                style={{ width: `${achievements.progress.progressToNextLevel}%` }}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="surface-card rounded-[22px] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">Total XP</p>
              <p className="mt-3 font-headline text-[2rem] text-[var(--foreground)]">{achievements.progress.currentXp}</p>
            </div>
            <div className="surface-card rounded-[22px] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">Current Streak</p>
              <p className="mt-3 font-headline text-[2rem] text-[var(--foreground)]">🔥 {stats.totalStudyTime > 0 ? "Active" : "0"}</p>
            </div>
            <div className="surface-card rounded-[22px] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">Study Days</p>
              <p className="mt-3 font-headline text-[2rem] text-[var(--foreground)]">{achievements.achievements.length}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-[var(--foreground)]">
              <IconUserCircle className="h-3.5 w-3.5" />
              Name
            </label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <label className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-[var(--foreground)]">
              <IconMail className="h-3.5 w-3.5" />
              Email
            </label>
            <Input value={profile.email} readOnly />
          </div>
          <div>
            <label className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-[var(--foreground)]">Timezone</label>
            <Input value={timezone} onChange={(event) => setTimezone(event.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={restartTour} className="gap-2">
              <IconRefresh className="h-4 w-4" />
              Restart Tour
            </Button>
            <Button onClick={saveProfile} disabled={saving || !changed} className="gap-2">
              <IconDeviceFloppy className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Trophy Case</p>
            <h3 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Achievements</h3>
          </div>
          <div className="flex gap-2">
            {(["all", "unlocked", "locked"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-full border px-4 py-2 text-sm ${filter === value ? "bg-[#7B6CF6] text-white" : "border-[color:var(--panel-border)] text-[var(--muted-foreground)]"}`}
              >
                {value[0].toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleDefinitions.map((definition) => {
            const unlocked = unlockedIds.has(definition.id);
            const unlockedAt = achievements.achievements.find((item) => (item.achievementId ?? item.type) === definition.id)?.unlockedAt;
            return (
              <div
                key={definition.id}
                className={`rounded-[24px] border p-5 ${unlocked ? "glass-card" : "bg-[color:var(--surface-low)] opacity-70"}`}
                style={unlocked ? { borderColor: `${definition.color}44` } : undefined}
              >
                <p className={`text-4xl ${unlocked ? "" : "grayscale blur-[1px]"}`}>{definition.icon}</p>
                <p className="mt-4 text-lg font-semibold text-[var(--foreground)]">{definition.name}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{unlocked ? definition.desc : "???"}</p>
                <p className="mt-3 text-xs text-[var(--tertiary-foreground)]">{unlockedAt ? new Date(unlockedAt).toLocaleDateString() : "Locked"}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card p-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Stats</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Total notes", stats.totalNotes],
            ["Total quizzes", stats.totalQuizzes],
            ["Focus sessions", stats.totalFocusSessions],
            ["Scans", stats.totalScans],
            ["Evaluations", stats.totalEvaluations],
            ["Most studied subject", stats.mostStudiedSubject],
            ["Average quiz score", `${stats.averageQuizScore}%`],
            ["Total study time", `${stats.totalStudyTime} min`]
          ].map(([label, value]) => (
            <div key={label} className="surface-card rounded-[22px] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">{label}</p>
              <p className="mt-3 font-headline text-[2rem] text-[var(--foreground)]">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
