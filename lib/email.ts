import nodemailer from "nodemailer";

let cachedTransporter: nodemailer.Transporter | null = null;

function extractEmailAddress(value: string) {
  const trimmed = value.trim();
  const angleMatch = trimmed.match(/<([^>]+)>/);
  const candidate = (angleMatch?.[1] ?? trimmed).trim().toLowerCase();
  return candidate;
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function getEmailConfigDiagnostics() {
  const diagnostics: string[] = [];
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const port = Number(process.env.SMTP_PORT ?? "");
  const smtpUser = process.env.SMTP_USER?.trim() ?? "";
  const emailFrom = process.env.EMAIL_FROM?.trim() ?? "";
  const fromAddress = emailFrom ? extractEmailAddress(emailFrom) : "";
  const secure =
    process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465;

  if (!emailFrom) {
    diagnostics.push("Missing EMAIL_FROM for SMTP email delivery.");
  }

  if (!host || !process.env.SMTP_PORT || !smtpUser || !process.env.SMTP_PASS) {
    diagnostics.push("Missing SMTP configuration. Required: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.");
  }

  if (process.env.SMTP_PORT && (!Number.isFinite(port) || port <= 0)) {
    diagnostics.push("SMTP_PORT must be a valid number.");
  }

  if (smtpUser && !looksLikeEmail(smtpUser)) {
    diagnostics.push("SMTP_USER should be the real mailbox address, not a display name.");
  }

  if (emailFrom && !looksLikeEmail(fromAddress)) {
    diagnostics.push("EMAIL_FROM must be an email address or a display-name format like StudyOS <mailbox@example.com>.");
  }

  const normalizedHost = host.toLowerCase();
  if (normalizedHost === "smtp.gmail.com") {
    if (port === 587 && process.env.SMTP_SECURE === "true") {
      diagnostics.push("For Gmail on port 587, set SMTP_SECURE=false so STARTTLS can be negotiated correctly.");
    }
    if (port === 465 && process.env.SMTP_SECURE === "false") {
      diagnostics.push("For Gmail on port 465, set SMTP_SECURE=true.");
    }
    if (smtpUser && looksLikeEmail(smtpUser) && fromAddress && smtpUser.toLowerCase() !== fromAddress) {
      diagnostics.push("For Gmail, EMAIL_FROM should resolve to the same mailbox as SMTP_USER.");
    }
  }

  return {
    provider: normalizedHost === "smtp.gmail.com" ? "gmail" : "smtp",
    host,
    port,
    secure,
    authUser: smtpUser,
    emailFrom,
    fromAddress,
    diagnostics,
    ok: diagnostics.length === 0
  };
}

function ensureEmailConfig() {
  if (!process.env.EMAIL_FROM) {
    throw new Error("Missing EMAIL_FROM for SMTP email delivery");
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("Missing SMTP configuration. Required: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS");
  }

  const config = getEmailConfigDiagnostics();
  if (!config.ok) {
    throw new Error(config.diagnostics.join(" "));
  }

  return config;
}

function getTransporter() {
  const config = ensureEmailConfig();

  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: config.port,
    secure: config.secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return cachedTransporter;
}

async function sendEmail({
  to,
  subject,
  html,
  context
}: {
  to: string;
  subject: string;
  html: string;
  context: string;
}) {
  const transporter = getTransporter();

  try {
    return await transporter.sendMail({
      from: process.env.EMAIL_FROM!,
      to,
      subject,
      html
    });
  } catch (error) {
    console.error(`Failed to send ${context} email`, {
      to,
      subject,
      error
    });
    throw error;
  }
}

export async function verifyEmailTransport() {
  const transporter = getTransporter();
  await transporter.verify();
  return getEmailConfigDiagnostics();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getAppUrl() {
  const value = process.env.APP_URL?.trim() ?? "";
  if (!value) return null;
  return value.replace(/\/+$/, "");
}

function buildAppUrl(path: string) {
  const appUrl = getAppUrl();
  if (!appUrl) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${appUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

interface EmailStat {
  label: string;
  value: string;
}

interface EmailTemplateOptions {
  preheader: string;
  eyebrow: string;
  title: string;
  intro: string;
  paragraphs?: string[];
  accent?: string;
  cta?: {
    label: string;
    path: string;
  };
  stats?: EmailStat[];
  footnote?: string;
}

function emailShell({
  preheader,
  eyebrow,
  title,
  intro,
  paragraphs = [],
  accent = "#9A8CFF",
  cta,
  stats = [],
  footnote
}: EmailTemplateOptions) {
  const ctaHref = cta ? buildAppUrl(cta.path) : null;
  const paragraphMarkup = paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 12px;color:#c9c1e2;font-size:15px;line-height:1.72;">${escapeHtml(paragraph)}</p>`
    )
    .join("");
  const statMarkup = stats.length
    ? `<div style="margin-top:20px;">
        ${stats
          .map(
            (stat) => `<span style="display:inline-block;margin:0 10px 10px 0;padding:12px 14px;border-radius:16px;border:1px solid rgba(154,140,255,0.16);background:rgba(255,255,255,0.04);">
              <span style="display:block;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#9e95bc;margin-bottom:6px;">${escapeHtml(stat.label)}</span>
              <span style="display:block;font-size:18px;line-height:1.2;font-weight:700;color:#ffffff;">${escapeHtml(stat.value)}</span>
            </span>`
          )
          .join("")}
      </div>`
    : "";
  const ctaMarkup =
    cta && ctaHref
      ? `<a href="${escapeHtml(ctaHref)}" style="display:inline-block;margin-top:24px;padding:14px 20px;border-radius:999px;background:${accent};color:#120f1c;font-size:14px;font-weight:700;text-decoration:none;">${escapeHtml(cta.label)}</a>`
      : "";
  const footnoteMarkup = footnote
    ? `<p style="margin:18px 0 0;color:#8f86ab;font-size:12px;line-height:1.6;">${escapeHtml(footnote)}</p>`
    : "";

  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}${"&nbsp;".repeat(24)}</div>
    <div style="margin:0;background:#080610;padding:28px 14px;font-family:Arial,sans-serif;color:#f5efff;">
      <div style="max-width:640px;margin:0 auto;border-radius:28px;overflow:hidden;background:linear-gradient(180deg,#161225 0%,#0f0c18 100%);border:1px solid rgba(209,198,240,0.12);box-shadow:0 24px 64px rgba(4,3,10,0.42);">
        <div style="height:5px;background:${accent};"></div>
        <div style="padding:28px 26px 12px;background:radial-gradient(circle at top right, rgba(154,140,255,0.22), transparent 34%),radial-gradient(circle at 18% 0%, rgba(122,215,178,0.12), transparent 28%);">
          <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${accent};font-weight:700;">${escapeHtml(eyebrow)}</p>
          <h2 style="margin:0;font-size:32px;line-height:1.08;color:#ffffff;">${escapeHtml(title)}</h2>
          <p style="margin:14px 0 0;color:#ece6ff;font-size:16px;line-height:1.7;">${escapeHtml(intro)}</p>
          ${statMarkup}
          ${ctaMarkup}
        </div>
        <div style="padding:8px 26px 26px;">
          ${paragraphMarkup}
          ${footnoteMarkup}
          <div style="margin-top:24px;padding-top:18px;border-top:1px solid rgba(209,198,240,0.12);">
            <p style="margin:0;color:#9e95bc;font-size:12px;line-height:1.6;">StudyOS</p>
            <p style="margin:6px 0 0;color:#7f7897;font-size:12px;line-height:1.6;">Student Productivity Platform</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function sendWelcomeEmail(to: string, name: string) {
  const firstName = name.split(" ")[0] || "Student";
  return sendEmail({
    to,
    subject: "Welcome to StudyOS",
    html: emailShell({
      preheader: "Your quieter study workspace is ready.",
      eyebrow: "New workspace",
      title: `Welcome, ${firstName}.`,
      intro: "Your StudyOS setup is ready with a darker welcome flow, a cleaner guided tour, and calmer study tools.",
      paragraphs: [
        "Open the welcome screen to start your first guided walkthrough.",
        "You can jump into notes, quizzes, planner, and doubt solving from one focused workspace."
      ],
      accent: "#9A8CFF",
      cta: {
        label: "Open welcome flow",
        path: "/welcome"
      }
    }),
    context: "welcome"
  });
}

export async function sendAchievementEmail(to: string, title: string, description: string) {
  return sendEmail({
    to,
    subject: `Achievement unlocked: ${title}`,
    html: emailShell({
      preheader: `Achievement unlocked: ${title}`,
      eyebrow: "Achievement",
      title: `You unlocked ${title}.`,
      intro: description,
      paragraphs: ["Nice work. Keep the next small study session moving and let the streak stack."],
      accent: "#7AD7B2",
      cta: {
        label: "See your progress",
        path: "/progress"
      }
    }),
    context: "achievement"
  });
}

export async function sendStreakMilestoneEmail(to: string, streak: number) {
  return sendEmail({
    to,
    subject: `You reached a ${streak}-day StudyOS streak`,
    html: emailShell({
      preheader: `${streak} days of study momentum.`,
      eyebrow: "Streak milestone",
      title: `${streak} days in a row.`,
      intro: `You have shown up for ${streak} straight day${streak === 1 ? "" : "s"} in StudyOS.`,
      paragraphs: ["Protect it with one more focused action today, even if it is just a short note or quiz."],
      accent: "#9A8CFF",
      cta: {
        label: "Open progress",
        path: "/progress"
      }
    }),
    context: "streak milestone"
  });
}

export async function sendStreakRiskEmail(to: string, streak: number) {
  return sendEmail({
    to,
    subject: "Your StudyOS streak is at risk",
    html: emailShell({
      preheader: "One quick session keeps your streak alive.",
      eyebrow: "Streak alert",
      title: "Protect your streak today.",
      intro: `You are sitting on a ${streak}-day streak right now.`,
      paragraphs: ["One focused note, quiz, or completed planner task is enough to keep the chain going."],
      accent: "#F2C75C",
      cta: {
        label: "Open dashboard",
        path: "/dashboard"
      }
    }),
    context: "streak risk"
  });
}

export async function sendStreakBrokenEmail(to: string, previousStreak: number) {
  return sendEmail({
    to,
    subject: "Your StudyOS streak broke",
    html: emailShell({
      preheader: "Reset the streak with one small study action.",
      eyebrow: "Streak reset",
      title: "Your streak paused.",
      intro: `Your ${previousStreak}-day streak ended, but the rebuild can start today.`,
      paragraphs: ["Open StudyOS, take one small action, and turn the next session into the start of a new run."],
      accent: "#F3A2A2",
      cta: {
        label: "Return to dashboard",
        path: "/dashboard"
      }
    }),
    context: "streak broken"
  });
}

export async function sendDailyReminderEmail(to: string) {
  return sendEmail({
    to,
    subject: "Quick StudyOS reminder",
    html: emailShell({
      preheader: "A short study session still counts.",
      eyebrow: "Daily reminder",
      title: "A quick study check-in.",
      intro: "Even fifteen focused minutes is enough to keep your momentum warm today.",
      paragraphs: ["Open your dashboard, pick the next easiest action, and let the session begin without overthinking it."],
      accent: "#7AD7B2",
      cta: {
        label: "Open dashboard",
        path: "/dashboard"
      }
    }),
    context: "daily reminder"
  });
}

export async function sendWeeklySummaryEmail(
  to: string,
  payload: { minutes: number; notes: number; quizzes: number; avgScore: number }
) {
  return sendEmail({
    to,
    subject: "Your weekly StudyOS summary",
    html: emailShell({
      preheader: "A clean look at the work you finished this week.",
      eyebrow: "Weekly summary",
      title: "This week in StudyOS.",
      intro: "Your progress is being built from real study time, real notes, and real quiz work.",
      stats: [
        { label: "Study minutes", value: `${payload.minutes}` },
        { label: "Notes", value: `${payload.notes}` },
        { label: "Quizzes", value: `${payload.quizzes}` },
        { label: "Average score", value: `${payload.avgScore}%` }
      ],
      paragraphs: ["Keep the rhythm going. Another small week of consistent work compounds faster than it feels."],
      accent: "#9A8CFF",
      cta: {
        label: "Review progress",
        path: "/progress"
      }
    }),
    context: "weekly summary"
  });
}
