import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { DEFAULT_ASSISTANT_INSTRUCTIONS } from "@resonance/ai";

const prisma = new PrismaClient();

async function seedAdminUser() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set (see .env.example) before seeding.",
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Seed user ${email} already exists, skipping.`);
    return;
  }

  const passwordHash = await argon2.hash(password);
  const user = await prisma.user.create({
    data: {
      email,
      displayName: "Resonance Admin",
      passwordHash,
    },
  });

  console.log(`Created seed user ${user.email} (${user.id}).`);
}

async function seedDefaultPromptVersion() {
  await prisma.promptVersion.upsert({
    where: { name_version: { name: "resonance_assistant", version: 1 } },
    update: {},
    create: {
      name: "resonance_assistant",
      version: 1,
      instructions: DEFAULT_ASSISTANT_INSTRUCTIONS,
      active: true,
    },
  });
  console.log("Ensured default resonance_assistant prompt version (v1) exists and is active.");
}

async function main() {
  await seedAdminUser();
  await seedDefaultPromptVersion();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
