import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { authOptions } from "./auth";

/**
 * Runs once at server start: creates Better Auth's tables, then seeds the
 * admin from ADMIN_EMAIL / ADMIN_PASSWORD if that user doesn't exist yet.
 */
export async function bootstrap() {
  const { runMigrations } = await getMigrations(authOptions);
  await runMigrations();

  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const { rows } = await authOptions.database.query('SELECT 1 FROM "user" WHERE email = $1', [email]);
  if (rows.length) return;

  // Separate instance with sign-up enabled, used only here, never exposed over HTTP.
  const seeder = betterAuth({ ...authOptions, emailAndPassword: { ...authOptions.emailAndPassword, disableSignUp: false } });
  await seeder.api.signUpEmail({ body: { email, password, name: email.split("@")[0] } });
  console.log(`[auth] admin user created: ${email}`);
}
