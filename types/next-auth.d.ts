import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      image?: string | null;
      role?: "student" | "admin";
      status?: "active" | "suspended";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    image?: string | null;
    role?: "student" | "admin";
    status?: "active" | "suspended";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    picture?: string | null;
    role?: "student" | "admin";
    status?: "active" | "suspended";
  }
}
