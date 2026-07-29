import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";

const workspaceDomain = process.env.ZARHAK_WORKSPACE_DOMAIN ?? "zarhak.com";

// A small allowlist of accounts outside @zarhak.com that should still get in (e.g. the
// account the real production AppSheet app already grants Admin access to). Comma-separated.
const extraAllowedEmails = new Set(
  (process.env.AUTH_EXTRA_ALLOWED_EMAILS ?? "tridgebusiness@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

function isAllowedEmail(email: string | null | undefined) {
  if (!email) return false;
  const lower = email.toLowerCase();
  return lower.endsWith(`@${workspaceDomain}`) || extraAllowedEmails.has(lower);
}

const devLoginEnabled =
  process.env.AUTH_DEV_LOGIN === "1" && process.env.NODE_ENV !== "production";

const providers: NextAuthConfig["providers"] = [
  Google({
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
    authorization: { params: { hd: workspaceDomain } },
  }),
];

if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev-login",
      name: "Dev login (local only)",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        if (!email || !isAllowedEmail(email)) return null;

        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: {
            email,
            name: String(credentials?.name ?? email.split("@")[0]),
            role: "PENDING",
          },
        });

        return { id: user.id, email: user.email, name: user.name };
      },
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  providers,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      return isAllowedEmail(user.email);
    },
    async jwt({ token, user }) {
      if (user?.email) {
        // On first sign-in `user` comes from the provider/adapter; look up (or the
        // dev-login provider already created) the real row to get the current role.
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
        }
      } else if (token.userId) {
        // Refresh role on subsequent requests in case an admin changed it.
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId as string },
        });
        if (dbUser) token.role = dbUser.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
});
