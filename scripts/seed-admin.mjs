/**
 * Run once to create the initial admin user:
 *   node scripts/seed-admin.mjs
 */
import { createHash, randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EMAIL = "admin@example.com";
const PASSWORD = "admin123";
const NAME = "Admin";

function hashPassword(password) {
  return createHash("sha256").update(password).digest("hex");
}

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });

  if (existing) {
    console.log(`User ${EMAIL} already exists (id: ${existing.id}). Nothing to do.`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      id: "usr_" + randomBytes(10).toString("hex"),
      email: EMAIL,
      name: NAME,
      passwordHash: hashPassword(PASSWORD),
      role: "OWNER",
    },
  });

  console.log("✓ Admin user created!");
  console.log(`  Email   : ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log(`  ID      : ${user.id}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
