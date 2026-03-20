"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/profile");
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? "Unable to load profile");
        return;
      }

      const loaded = data.profile as ProfilePayload;
      setProfile(loaded);
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
    window.dispatchEvent(new CustomEvent("tour:profile-saved"));
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

  if (!profile) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44" />
        <Skeleton className="h-56" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Account</p>
        <h2 className="mt-2 font-headline text-4xl tracking-[-0.04em] text-[var(--foreground)] sm:text-6xl">Profile</h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
          Manage your personal details and restart the guided tour whenever you want a fresh walkthrough.
        </p>
      </div>

      <div className="glass-card max-w-3xl p-6">
        <h3 className="mb-4 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Personal information</h3>
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
            <p className="line-clamp-1 text-lg font-medium text-[var(--foreground)]">{profile.name}</p>
            <p className="line-clamp-1 text-sm text-[var(--muted-foreground)]">{profile.email}</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <label className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-[var(--foreground)]">
              <IconUserCircle className="h-3.5 w-3.5" />
              Name
            </label>
            <Input data-tour-id="profile-name-input" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <label className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-[var(--foreground)]">
              <IconMail className="h-3.5 w-3.5" />
              Email
            </label>
            <Input value={profile.email} readOnly />
          </div>
          <div>
            <label className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-[var(--foreground)]">Timezone</label>
            <Input value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="Asia/Kolkata" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={restartTour} className="gap-2">
          <IconRefresh className="h-4 w-4" />
          Restart Tour
        </Button>
        <Button data-tour-id="profile-save-button" onClick={saveProfile} disabled={saving || !changed} className="gap-2">
          <IconDeviceFloppy className="h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </motion.div>
  );
}
