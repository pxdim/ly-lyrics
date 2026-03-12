/**
 * NextAuth.js Configuration
 *
 * Authentication configuration using NextAuth.js with credentials provider.
 * Replaces Supabase Auth with self-hosted solution.
 *
 * @module lib/auth/config
 */

import type { User as NextAuthUser } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";

// ============================================================================
// NextAuth Configuration
// ============================================================================

type NextAuthConfig = {
  providers: any[];
  session: { strategy: "jwt"; maxAge: number };
  pages: { signIn: string; error: string };
  callbacks: {
    jwt: (params: { token: JWT; user?: NextAuthUser | undefined; trigger?: "signIn" | "signUp" | "update" | undefined }) => Promise<JWT> | JWT;
    session: (params: { session: any; token: JWT; user?: NextAuthUser | undefined; trigger?: "signIn" | "signUp" | "update" | undefined }) => Promise<any> | any;
  };
  events: {
    signIn?: ((params: { user: NextAuthUser }) => Promise<void> | void) | undefined;
    signOut?: ((params: { token: JWT; session?: any }) => Promise<void> | void) | undefined;
    error?: ((params: { error: Error }) => Promise<void> | void) | undefined;
  };
  debug?: boolean | undefined;
};

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "user@example.com",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        // 驗證必要欄位
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // 透過 Go 後端驗證帳號密碼
        const goBackendUrl =
          process.env["GO_BACKEND_URL"] || "http://localhost:8080";
        const res = await fetch(`${goBackendUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });

        if (!res.ok) {
          return null;
        }

        const data = await res.json();

        // 回傳使用者物件供 session 使用
        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },

    async session({ session, token }) {
      // Add user properties to session
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },

  events: {
    async signIn({ user }) {
      console.log(`[Auth] User signed in: ${user.email}`);
    },
    async signOut({ token }) {
      console.log(`[Auth] User signed out: ${token.email}`);
    },
    async error({ error }) {
      console.error(`[Auth] Error:`, error);
    },
  },

  debug: process.env["NODE_ENV"] === "development",
};

// ============================================================================
// Type Extensions
// ============================================================================

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name: string | null;
  }
}
