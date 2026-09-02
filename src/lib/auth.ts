import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "parent",
      name: "Parent",
      credentials: {
        email: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name || user.email,
          role: "parent" as const,
        };
      },
    }),
    CredentialsProvider({
      id: "kid",
      name: "Kid",
      credentials: {
        childId: { label: "Child", type: "text" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.childId || !credentials?.pin) return null;
        const child = await prisma.child.findUnique({
          where: { id: credentials.childId },
        });
        if (!child || !child.active || !child.pin) return null;
        const valid = await bcrypt.compare(credentials.pin, child.pin);
        if (!valid) return null;
        return {
          id: child.id,
          name: child.name,
          email: null,
          role: "kid" as const,
          childId: child.id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.childId = user.childId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as "parent" | "kid";
        session.user.childId = token.childId as string | undefined;
        session.user.id = token.sub || "";
      }
      return session;
    },
  },
};
