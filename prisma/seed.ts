import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DIRECT_DATABASE_URL!,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@soupkitchen.org.nz" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@soupkitchen.org.nz",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log(`Admin user: ${admin.email} (password: admin123!)`);

  // Create coordinator user
  const coordPassword = await bcrypt.hash("coord123!", 12);
  const coordinator = await prisma.user.upsert({
    where: { email: "coordinator@soupkitchen.org.nz" },
    update: {},
    create: {
      name: "Coordinator User",
      email: "coordinator@soupkitchen.org.nz",
      password: coordPassword,
      role: "COORDINATOR",
    },
  });
  console.log(`Coordinator user: ${coordinator.email} (password: coord123!)`);

  // Create default service areas
  const serviceAreas = [
    { name: "Kitchen & Meals", description: "Preparing and serving kai to whānau" },
    { name: "Clothing & Essentials", description: "Sorting and distributing clothing and essentials" },
    { name: "Community Garden", description: "Growing fresh produce for the kitchen" },
    { name: "Events & Fundraising", description: "Organising community events and fundraisers" },
    { name: "Outreach & Advocacy", description: "Street outreach and social services support" },
  ];

  for (const area of serviceAreas) {
    await prisma.serviceArea.upsert({
      where: { name: area.name },
      update: {},
      create: area,
    });
  }
  console.log(`Created ${serviceAreas.length} service areas`);

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
