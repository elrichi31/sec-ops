import { betterAuth, type BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";

export const authOptions = {
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  // Internal tool: nobody signs up. Users are seeded from env (see lib/bootstrap.ts).
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12 },
  session: { expiresIn: 60 * 60 * 24 * 7 },
  plugins: [nextCookies()],
} satisfies BetterAuthOptions;

export const auth = betterAuth(authOptions);
