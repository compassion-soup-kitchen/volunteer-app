/**
 * Bootstrap (or promote) an ADMIN account — the production path for creating
 * the first staff user, since the app has no in-app role escalation to ADMIN.
 *
 * Usage (from apps/web, or inside the production container):
 *   pnpm run admin:create -- --email admin@example.org.nz --name "Kai Manager"
 *   pnpm run admin:create -- --email existing@user.org.nz --promote
 *
 * Password comes from ADMIN_INITIAL_PASSWORD if set; otherwise a strong random
 * one is generated and printed ONCE. Store it in a password manager and change
 * it after first login.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const emailArg = getArg("--email");
  const name = getArg("--name") ?? "Administrator";
  const promote = process.argv.includes("--promote");

  if (!emailArg || !emailArg.includes("@")) {
    console.error(
      "Usage: pnpm run admin:create -- --email <email> [--name <name>] [--promote]"
    );
    process.exit(1);
  }
  const email = emailArg.trim().toLowerCase();

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    max: 1,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      if (!promote) {
        console.error(
          `✋ ${email} already exists (role: ${existing.role}). ` +
            "Re-run with --promote to make this account an ADMIN. " +
            "Passwords are never changed by this script."
        );
        process.exit(1);
      }
      await prisma.user.update({
        where: { email },
        data: { role: "ADMIN", status: "ACTIVE" },
      });
      console.log(`✅ Promoted ${email} to ADMIN.`);
      return;
    }

    if (promote) {
      console.error(`✋ Cannot promote: no account exists for ${email}.`);
      process.exit(1);
    }

    const password =
      process.env.ADMIN_INITIAL_PASSWORD ?? randomBytes(12).toString("base64url");
    const hashed = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: { name, email, password: hashed, role: "ADMIN" },
    });

    console.log(`✅ Created ADMIN account ${email}`);
    if (!process.env.ADMIN_INITIAL_PASSWORD) {
      console.log(`🔑 Generated password (shown once): ${password}`);
    }
    console.log("   Sign in and change the password right away.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
