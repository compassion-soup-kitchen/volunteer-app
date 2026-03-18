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

  // Create volunteer user (approved, with profile)
  const volPassword = await bcrypt.hash("volunteer123!", 12);
  const volunteer = await prisma.user.upsert({
    where: { email: "volunteer@soupkitchen.org.nz" },
    update: {},
    create: {
      name: "Aroha Williams",
      email: "volunteer@soupkitchen.org.nz",
      password: volPassword,
      role: "VOLUNTEER",
    },
  });
  console.log(`Volunteer user: ${volunteer.email} (password: volunteer123!)`);

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

  // Create volunteer profile for Aroha
  const kitchenArea = await prisma.serviceArea.findUnique({ where: { name: "Kitchen & Meals" } });
  const gardenArea = await prisma.serviceArea.findUnique({ where: { name: "Community Garden" } });

  const existingProfile = await prisma.volunteerProfile.findUnique({
    where: { userId: volunteer.id },
  });

  if (!existingProfile) {
    const profile = await prisma.volunteerProfile.create({
      data: {
        userId: volunteer.id,
        phone: "021 555 1234",
        address: "42 Tory Street, Te Aro, Wellington 6011",
        dateOfBirth: new Date("1995-03-15"),
        emergencyContactName: "Hemi Williams",
        emergencyContactPhone: "021 555 5678",
        emergencyContactRelationship: "Partner",
        bio: "Passionate about helping our community through kai. Love cooking and gardening.",
        availability: {
          monday: ["morning"],
          wednesday: ["morning", "afternoon"],
          saturday: ["morning", "afternoon", "evening"],
        },
        skills: ["Cooking", "Food preparation", "Gardening", "Te reo Māori"],
        status: "ACTIVE",
        mojStatus: "CLEARED",
        interests: {
          connect: [kitchenArea, gardenArea].filter(Boolean).map((a) => ({ id: a!.id })),
        },
      },
    });

    // Create approved application
    await prisma.application.create({
      data: {
        volunteerId: profile.id,
        status: "APPROVED",
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });

    // Create signed agreements
    await prisma.signedAgreement.createMany({
      data: [
        {
          volunteerId: profile.id,
          agreementType: "CODE_OF_CONDUCT",
          signatureData: "data:image/png;base64,seed-placeholder",
          documentVersion: "1.0",
        },
        {
          volunteerId: profile.id,
          agreementType: "SAFEGUARDING",
          signatureData: "data:image/png;base64,seed-placeholder",
          documentVersion: "1.0",
        },
      ],
    });

    console.log("Created volunteer profile, application, and agreements for Aroha");

    // ─── Shifts ───────────────────────────────────────────
    const today = new Date();
    const toDate = (daysFromNow: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + daysFromNow);
      return d;
    };

    // Past shifts (for hours tracking)
    const pastShift1 = await prisma.shift.create({
      data: {
        serviceAreaId: kitchenArea!.id,
        date: toDate(-7),
        startTime: "08:00",
        endTime: "12:00",
        capacity: 6,
        notes: "Weekly kai prep",
        createdById: coordinator.id,
      },
    });

    const pastShift2 = await prisma.shift.create({
      data: {
        serviceAreaId: kitchenArea!.id,
        date: toDate(-14),
        startTime: "09:00",
        endTime: "13:00",
        capacity: 8,
        notes: "Community lunch service",
        createdById: coordinator.id,
      },
    });

    const pastShift3 = await prisma.shift.create({
      data: {
        serviceAreaId: gardenArea!.id,
        date: toDate(-3),
        startTime: "08:00",
        endTime: "11:00",
        capacity: 4,
        notes: "Planting season prep",
        createdById: coordinator.id,
      },
    });

    // Upcoming shifts
    const upcomingShift1 = await prisma.shift.create({
      data: {
        serviceAreaId: kitchenArea!.id,
        date: toDate(2),
        startTime: "08:00",
        endTime: "12:00",
        capacity: 6,
        notes: "Morning kai prep",
        createdById: coordinator.id,
      },
    });

    const upcomingShift2 = await prisma.shift.create({
      data: {
        serviceAreaId: gardenArea!.id,
        date: toDate(5),
        startTime: "09:00",
        endTime: "12:00",
        capacity: 5,
        notes: "Weeding and harvesting",
        createdById: coordinator.id,
      },
    });

    const upcomingShift3 = await prisma.shift.create({
      data: {
        serviceAreaId: kitchenArea!.id,
        date: toDate(9),
        startTime: "10:00",
        endTime: "14:00",
        capacity: 8,
        notes: "Weekend community lunch",
        createdById: coordinator.id,
      },
    });

    // Open shifts (no signup from Aroha — available to browse)
    const clothingArea = await prisma.serviceArea.findUnique({ where: { name: "Clothing & Essentials" } });
    const outreachArea = await prisma.serviceArea.findUnique({ where: { name: "Outreach & Advocacy" } });

    await prisma.shift.create({
      data: {
        serviceAreaId: clothingArea!.id,
        date: toDate(3),
        startTime: "13:00",
        endTime: "16:00",
        capacity: 4,
        notes: "Clothing sort and distribution",
        createdById: coordinator.id,
      },
    });

    await prisma.shift.create({
      data: {
        serviceAreaId: outreachArea!.id,
        date: toDate(6),
        startTime: "17:00",
        endTime: "20:00",
        capacity: 3,
        notes: "Evening street outreach",
        createdById: coordinator.id,
      },
    });

    // ─── Shift Signups ────────────────────────────────────

    // Past shifts — attended (gives Aroha volunteer hours)
    await prisma.shiftSignup.create({
      data: {
        shiftId: pastShift1.id,
        volunteerId: profile.id,
        status: "ATTENDED",
        attendanceMarkedById: coordinator.id,
        attendanceMarkedAt: toDate(-7),
      },
    });

    await prisma.shiftSignup.create({
      data: {
        shiftId: pastShift2.id,
        volunteerId: profile.id,
        status: "ATTENDED",
        attendanceMarkedById: coordinator.id,
        attendanceMarkedAt: toDate(-14),
      },
    });

    await prisma.shiftSignup.create({
      data: {
        shiftId: pastShift3.id,
        volunteerId: profile.id,
        status: "ATTENDED",
        attendanceMarkedById: coordinator.id,
        attendanceMarkedAt: toDate(-3),
      },
    });

    // Upcoming shifts — signed up
    await prisma.shiftSignup.create({
      data: {
        shiftId: upcomingShift1.id,
        volunteerId: profile.id,
        status: "SIGNED_UP",
      },
    });

    await prisma.shiftSignup.create({
      data: {
        shiftId: upcomingShift2.id,
        volunteerId: profile.id,
        status: "SIGNED_UP",
      },
    });

    console.log("Created shifts and signups");

    // ─── Training Sessions ────────────────────────────────

    const pastTraining = await prisma.trainingSession.create({
      data: {
        type: "INDUCTION",
        title: "Volunteer Induction — Nau Mai",
        description: "Welcome session covering health & safety, kitchen procedures, and our kaupapa",
        date: toDate(-21),
        startTime: "10:00",
        endTime: "12:00",
        capacity: 15,
        location: "Compassion Centre, 152 Tory St",
        createdById: coordinator.id,
      },
    });

    const upcomingTraining = await prisma.trainingSession.create({
      data: {
        type: "HEALTH_SAFETY",
        title: "Food Safety Refresher",
        description: "Annual food safety and hygiene training — required for kitchen volunteers",
        date: toDate(12),
        startTime: "09:00",
        endTime: "11:00",
        capacity: 20,
        location: "Compassion Centre, 152 Tory St",
        createdById: coordinator.id,
      },
    });

    await prisma.trainingSession.create({
      data: {
        type: "DE_ESCALATION",
        title: "De-escalation & Tika Communication",
        description: "Skills for handling difficult situations with aroha and respect",
        date: toDate(20),
        startTime: "13:00",
        endTime: "15:30",
        capacity: 12,
        location: "Compassion Centre, 152 Tory St",
        createdById: coordinator.id,
      },
    });

    // Training attendance
    await prisma.trainingAttendance.create({
      data: {
        sessionId: pastTraining.id,
        volunteerId: profile.id,
        status: "ATTENDED",
      },
    });

    await prisma.trainingAttendance.create({
      data: {
        sessionId: upcomingTraining.id,
        volunteerId: profile.id,
        status: "REGISTERED",
      },
    });

    console.log("Created training sessions and attendance");

    // ─── Announcements ────────────────────────────────────

    await prisma.announcement.create({
      data: {
        title: "Matariki Community Dinner — Volunteers Needed!",
        body: "We're hosting a special Matariki celebration dinner on July 14th. We need extra hands in the kitchen and for setup/pack-down. Sign up for shifts if you can help — it's going to be a beautiful evening of kai and whanaungatanga.",
        audience: "ALL",
        createdById: coordinator.id,
        sentAt: toDate(-2),
      },
    });

    await prisma.announcement.create({
      data: {
        title: "Updated Kitchen Procedures",
        body: "Please note the updated food handling procedures posted in the kitchen. All kitchen volunteers must review these before their next shift. Ngā mihi for keeping our whānau safe.",
        audience: "VOLUNTEERS",
        createdById: admin.id,
        sentAt: toDate(-5),
      },
    });

    console.log("Created announcements");
  }

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
