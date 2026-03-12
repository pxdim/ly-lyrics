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
import { verifyPassword } from "./password";
import { getUserByEmail } from "@/lib/services/userService";
import { AppError } from "@/lib/errors/AppError";

// ============================================================================
// NextAuth Configuration
// ============================================================================

type NextAuthConfig = {
  providers: any[];
  session: { strategy: "jwt"; maxAge: number };
  pages: { signIn: string; error: string };
  callbacks: {
    jwt: (params: { token: JWT; user?: NextAuthUser; trigger?: "signIn" | "update" }) => Promise<JWT> | JWT;
    session: (params: { session: any; token: JWT; user?: NextAuthUser; trigger?: "signIn" | "update" }) => Promise<any> | any;
  };
  events: {
    signIn?: (params: { user: NextAuthUser }) => Promise<void> | void;
    signOut?: (params: { token: JWT; session?: any }) => Promise<void> | void;
    error?: (params: { error: Error }) => Promise<void> | void;
  };
  debug?: boolean;
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
        // Validate credentials
        if (!credentials?.email || !credentials?.password) {
          throw new AppError(
            "AUTH_MISSING_CREDENTIALS",
            "Email and password are required",
            undefined,
            "error"
          );
        }

        // Get user from database
        const user = await getUserByEmail(credentials.email as string);

        if (!user) {
          throw new AppError(
            "AUTH_INVALID_CREDENTIALS",
            "Invalid email or password",
            undefined,
            "warning"
          );
        }

        // Verify password
        const isValidPassword = await verifyPassword(
          credentials.password as string,
          user.password_hash
        );

        if (!isValidPassword) {
          throw new AppError(
            "AUTH_INVALID_CREDENTIALS",
            "Invalid email or password",
            undefined,
            "warning"
          );
        }

        // Return user object for session
        return {
          id: user.id,
          email: user.email,
          name: user.name,
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
