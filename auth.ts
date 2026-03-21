import NextAuth from "next-auth";
import { customFetch } from "next-auth";
import Google from "next-auth/providers/google";
import { setDefaultResultOrder } from "node:dns";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { sendWelcomeEmail } from "@/lib/email";
import { createWelcomeNotification } from "@/lib/notifications";
import { normalizeTimeZone } from "@/lib/timezone";

// Helps avoid intermittent IPv6-related ETIMEDOUT during OAuth callbacks on some networks.
setDefaultResultOrder("ipv4first");

const resilientGoogleFetch: typeof fetch = async (input, init) => {
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fetch(input, init);
    } catch (error) {
      lastError = error;
      const code =
        error && typeof error === "object" && "cause" in error
          ? (error as { cause?: { code?: string } }).cause?.code
          : undefined;

      if (code !== "ETIMEDOUT" || attempt === maxAttempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }

  throw lastError;
};

function isBootstrapAdminEmail(email: string) {
  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return allowlist.includes(email.trim().toLowerCase());
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      [customFetch]: resilientGoogleFetch
    })
  ],
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) {
        return false;
      }

      await connectToDatabase();
      const now = new Date();
      const existing = await UserModel.findOne({ email: user.email });
      const shouldBootstrapAdmin = isBootstrapAdminEmail(user.email);

      if (existing) {
        if (existing.status === "suspended") {
          return false;
        }

        existing.name = user.name ?? existing.name;
        existing.image = user.image ?? existing.image;
        existing.lastActive = now;
        existing.role = shouldBootstrapAdmin ? "admin" : existing.role ?? "student";
        if (!existing.status) {
          existing.status = "active";
        }
        const shouldBackfillOnboarding =
          existing.welcomeScreenSeen !== false ||
          Boolean(existing.isTourShown) ||
          (existing.totalNotesGenerated ?? 0) > 0 ||
          (existing.totalQuizzesTaken ?? 0) > 0;
        if (typeof existing.isTourShown !== "boolean") {
          existing.isTourShown = false;
        }
        if (typeof existing.welcomeScreenSeen !== "boolean") {
          existing.welcomeScreenSeen = true;
        }
        if (typeof existing.onboardingCompleted !== "boolean") {
          existing.onboardingCompleted = shouldBackfillOnboarding;
        } else if (!existing.onboardingCompleted && shouldBackfillOnboarding) {
          existing.onboardingCompleted = true;
        }
        if (typeof existing.onboardingStep !== "number") {
          existing.onboardingStep = 0;
        }
        if (!existing.studyProfile) {
          existing.studyProfile = {
            class: "",
            board: "",
            subjects: [],
            examGoal: "",
            studyHoursPerDay: 0,
            weakAreas: [],
            studyStyle: ""
          };
        }
        existing.timezone = normalizeTimeZone(existing.timezone);
        if (!existing.notificationPreferences) {
          existing.notificationPreferences = {
            achievement: true,
            streakRisk: true,
            weeklySummary: true,
            dailyReminder: true
          };
        } else if (typeof existing.notificationPreferences.dailyReminder !== "boolean") {
          existing.notificationPreferences.dailyReminder = true;
        }
        if (account?.providerAccountId) {
          existing.googleId = account.providerAccountId;
        }
        await existing.save();
      } else {
        const createdUser = await UserModel.create({
          email: user.email,
          name: user.name ?? "Student",
          image: user.image,
          googleId: account?.providerAccountId,
          role: shouldBootstrapAdmin ? "admin" : "student",
          status: "active",
          lastActive: now,
          onboardingCompleted: false,
          onboardingStep: 0,
          studyProfile: {
            class: "",
            board: "",
            subjects: [],
            examGoal: "",
            studyHoursPerDay: 0,
            weakAreas: [],
            studyStyle: ""
          },
          isTourShown: false,
          welcomeScreenSeen: false,
          timezone: "UTC",
          notificationPreferences: {
            achievement: true,
            streakRisk: true,
            weeklySummary: true,
            dailyReminder: true
          }
        });

        const [welcomeNotificationResult, welcomeEmailResult] = await Promise.allSettled([
          createWelcomeNotification(createdUser._id.toString()),
          sendWelcomeEmail(user.email, user.name ?? "Student")
        ]);

        if (welcomeNotificationResult.status === "rejected") {
          console.error("Failed to create welcome notification during signup", welcomeNotificationResult.reason);
        }

        if (welcomeEmailResult.status === "rejected") {
          console.error("Failed to send welcome email during signup", welcomeEmailResult.reason);
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      const lookupEmail = user?.email ?? token.email;
      if (lookupEmail) {
        await connectToDatabase();
        const dbUser = await UserModel.findOne({ email: lookupEmail }).select("_id image role status");
        if (dbUser) {
          token.id = dbUser._id.toString();
          token.picture = dbUser.image ?? token.picture;
          token.role = dbUser.role ?? "student";
          token.status = dbUser.status ?? "active";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = String(token.id);
        session.user.image = (token.picture as string | null | undefined) ?? session.user.image;
        session.user.role = token.role as "student" | "admin" | undefined;
        session.user.status = token.status as "active" | "suspended" | undefined;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login"
  }
});
