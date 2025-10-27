import type { NextRequest } from "next/server";
import { headers, cookies } from "next/headers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import { account, session, user, verification } from "@/db/schema/auth";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg", // or "mysql", "sqlite"
        schema: {
            user: user,
            account: account,
            session: session,
            verification: verification,
        }
    }),
    session: {
        strategy: "jwt",
        maxAge: 60 * 15, // 15m access
        updateAge: 60 * 5 // 5m refresh
    },
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
    },
});

// Use in Route Handlers when you have a NextRequest
export async function getSessionFromRequest(req: NextRequest) {
    return auth.api.getSession({ headers: req.headers });
}

// Use in Server Components / Actions (no req object)
export async function getSession() {
    return auth.api.getSession({ headers: headers(), cookies: cookies() });
}

export async function requireSession(req: NextRequest) {
    const session = await getSessionFromRequest(req);
    if (!session) throw new Error("UNAUTHORIZED");
    return session;
}

export async function requireAdmin(req: NextRequest) {
    const session = await requireSession(req);
    if (session.user.role !== "ADMIN") throw new Error("FORBIDDEN");
    return session;
}