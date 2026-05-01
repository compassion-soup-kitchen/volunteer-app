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
  console.log("🌱 Seeding database...");

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
  console.log(`🔑 Admin user: ${admin.email} (password: admin123!)`);

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
  console.log(`📋 Coordinator user: ${coordinator.email} (password: coord123!)`);

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
  console.log(`🙋 Volunteer user: ${volunteer.email} (password: volunteer123!)`);

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
  console.log(`🏠 Created ${serviceAreas.length} service areas`);

  // Create agreement templates
  await prisma.agreementTemplate.upsert({
    where: { agreementType: "CODE_OF_CONDUCT" },
    update: {},
    create: {
      agreementType: "CODE_OF_CONDUCT",
      title: "Te Tikanga — Code of Conduct",
      content: `As a volunteer at Compassion Soup Kitchen | Te Pūaroha, I agree to:

• Treat all people with aroha (love), manaakitanga (hospitality), and respect
• Maintain confidentiality about the people we serve
• Follow health and safety guidelines at all times
• Arrive on time for scheduled shifts and notify coordinators of absences
• Respect the property and resources of the organisation
• Work cooperatively with other volunteers, staff, and coordinators
• Represent Compassion Soup Kitchen positively in the community
• Report any concerns about safety or welfare to a coordinator`,
      version: "1.0",
      updatedById: admin.id,
    },
  });

  await prisma.agreementTemplate.upsert({
    where: { agreementType: "SAFEGUARDING" },
    update: {},
    create: {
      agreementType: "SAFEGUARDING",
      title: "Safeguarding Policy",
      content: `As a volunteer, I understand and commit to:

• Acting in the best interests of all tamariki (children) and vulnerable people
• Never being alone with a child or vulnerable person in an unsupervised setting
• Reporting any concerns about abuse or neglect to a coordinator immediately
• Completing a Ministry of Justice (MOJ) check if required
• Maintaining appropriate boundaries with all people we serve
• Not using personal devices to photograph or record people we serve
• Understanding that breaches of this policy may result in immediate removal`,
      version: "1.0",
      updatedById: admin.id,
    },
  });

  console.log("📝 Created agreement templates");

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

    console.log("💚 Created volunteer profile, application, and agreements for Aroha");

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

    await prisma.shift.create({
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

    const eventsArea = await prisma.serviceArea.findUnique({ where: { name: "Events & Fundraising" } });

    await prisma.shift.create({
      data: {
        serviceAreaId: kitchenArea!.id,
        date: toDate(4),
        startTime: "06:00",
        endTime: "10:00",
        capacity: 5,
        notes: "Early morning baking — bread and scones for the day",
        createdById: coordinator.id,
      },
    });

    await prisma.shift.create({
      data: {
        serviceAreaId: gardenArea!.id,
        date: toDate(7),
        startTime: "08:00",
        endTime: "12:00",
        capacity: 6,
        notes: "Seasonal planting and compost turning",
        createdById: coordinator.id,
      },
    });

    await prisma.shift.create({
      data: {
        serviceAreaId: eventsArea!.id,
        date: toDate(10),
        startTime: "14:00",
        endTime: "18:00",
        capacity: 10,
        notes: "Community kai event setup — extra hands needed!",
        createdById: coordinator.id,
      },
    });

    await prisma.shift.create({
      data: {
        serviceAreaId: clothingArea!.id,
        date: toDate(8),
        startTime: "09:00",
        endTime: "12:00",
        capacity: 4,
        notes: "Donated clothing sorting and quality check",
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

    console.log("📅 Created shifts and signups for Aroha");

    // ─── Additional Volunteers (for attendance testing) ───

    const vol2Password = await bcrypt.hash("volunteer123!", 12);
    const vol2User = await prisma.user.upsert({
      where: { email: "hemi@soupkitchen.org.nz" },
      update: {},
      create: {
        name: "Hemi Tūhoe",
        email: "hemi@soupkitchen.org.nz",
        password: vol2Password,
        role: "VOLUNTEER",
      },
    });

    const vol2Profile = await prisma.volunteerProfile.upsert({
      where: { userId: vol2User.id },
      update: {},
      create: {
        userId: vol2User.id,
        phone: "021 555 2222",
        address: "10 Cuba Street, Te Aro, Wellington",
        status: "ACTIVE",
        mojStatus: "CLEARED",
        interests: { connect: [{ id: kitchenArea!.id }] },
      },
    });

    await prisma.application.upsert({
      where: { id: "seed-app-hemi" },
      update: {},
      create: {
        id: "seed-app-hemi",
        volunteerId: vol2Profile.id,
        status: "APPROVED",
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });

    const vol3User = await prisma.user.upsert({
      where: { email: "mere@soupkitchen.org.nz" },
      update: {},
      create: {
        name: "Mere Ngata",
        email: "mere@soupkitchen.org.nz",
        password: vol2Password,
        role: "VOLUNTEER",
      },
    });

    const vol3Profile = await prisma.volunteerProfile.upsert({
      where: { userId: vol3User.id },
      update: {},
      create: {
        userId: vol3User.id,
        phone: "021 555 3333",
        address: "5 Courtenay Place, Wellington",
        status: "ACTIVE",
        mojStatus: "CLEARED",
        interests: { connect: [{ id: kitchenArea!.id }, { id: gardenArea!.id }] },
      },
    });

    await prisma.application.upsert({
      where: { id: "seed-app-mere" },
      update: {},
      create: {
        id: "seed-app-mere",
        volunteerId: vol3Profile.id,
        status: "APPROVED",
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });

    const vol4User = await prisma.user.upsert({
      where: { email: "tane@soupkitchen.org.nz" },
      update: {},
      create: {
        name: "Tāne Raukawa",
        email: "tane@soupkitchen.org.nz",
        password: vol2Password,
        role: "VOLUNTEER",
      },
    });

    const vol4Profile = await prisma.volunteerProfile.upsert({
      where: { userId: vol4User.id },
      update: {},
      create: {
        userId: vol4User.id,
        phone: "021 555 4444",
        address: "22 Willis Street, Wellington",
        status: "ACTIVE",
        mojStatus: "CLEARED",
        interests: { connect: [{ id: gardenArea!.id }] },
      },
    });

    await prisma.application.upsert({
      where: { id: "seed-app-tane" },
      update: {},
      create: {
        id: "seed-app-tane",
        volunteerId: vol4Profile.id,
        status: "APPROVED",
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });

    // Create signed agreements for additional volunteers
    for (const vol of [vol2Profile, vol3Profile, vol4Profile]) {
      await prisma.signedAgreement.createMany({
        data: [
          {
            volunteerId: vol.id,
            agreementType: "CODE_OF_CONDUCT",
            signatureData: "data:image/png;base64,seed-placeholder",
            documentVersion: "1.0",
          },
          {
            volunteerId: vol.id,
            agreementType: "SAFEGUARDING",
            signatureData: "data:image/png;base64,seed-placeholder",
            documentVersion: "1.0",
          },
        ],
      });
    }

    console.log("👥 Created additional volunteers: Hemi, Mere, Tāne");

    // ─── Past shift with UNMARKED signups (for testing attendance) ─

    const unmarkedPastShift = await prisma.shift.create({
      data: {
        serviceAreaId: kitchenArea!.id,
        date: toDate(-1),
        startTime: "08:00",
        endTime: "12:00",
        capacity: 6,
        notes: "Yesterday's kai prep — attendance needs marking",
        createdById: coordinator.id,
      },
    });

    // All four volunteers signed up, none marked yet
    for (const vol of [profile, vol2Profile, vol3Profile, vol4Profile]) {
      await prisma.shiftSignup.create({
        data: {
          shiftId: unmarkedPastShift.id,
          volunteerId: vol.id,
          status: "SIGNED_UP",
        },
      });
    }

    console.log("⏰ Created past shift with 4 unmarked signups (yesterday)");

    // Today's shift with signups
    const todayShift = await prisma.shift.create({
      data: {
        serviceAreaId: gardenArea!.id,
        date: toDate(0),
        startTime: "09:00",
        endTime: "13:00",
        capacity: 5,
        notes: "Today's garden mahi — mark attendance as volunteers arrive",
        createdById: coordinator.id,
      },
    });

    for (const vol of [profile, vol2Profile, vol3Profile]) {
      await prisma.shiftSignup.create({
        data: {
          shiftId: todayShift.id,
          volunteerId: vol.id,
          status: "SIGNED_UP",
        },
      });
    }

    console.log("🌤️ Created today's shift with 3 signups");

    // Signups on upcoming shifts from other volunteers too
    await prisma.shiftSignup.create({
      data: {
        shiftId: upcomingShift1.id,
        volunteerId: vol2Profile.id,
        status: "SIGNED_UP",
      },
    });

    await prisma.shiftSignup.create({
      data: {
        shiftId: upcomingShift1.id,
        volunteerId: vol3Profile.id,
        status: "SIGNED_UP",
      },
    });

    await prisma.shiftSignup.create({
      data: {
        shiftId: upcomingShift2.id,
        volunteerId: vol4Profile.id,
        status: "SIGNED_UP",
      },
    });

    // Past shift signups from other volunteers (some attended, some not)
    await prisma.shiftSignup.create({
      data: {
        shiftId: pastShift1.id,
        volunteerId: vol2Profile.id,
        status: "ATTENDED",
        attendanceMarkedById: coordinator.id,
        attendanceMarkedAt: toDate(-7),
      },
    });

    await prisma.shiftSignup.create({
      data: {
        shiftId: pastShift1.id,
        volunteerId: vol3Profile.id,
        status: "NO_SHOW",
        attendanceMarkedById: coordinator.id,
        attendanceMarkedAt: toDate(-7),
      },
    });

    console.log("✍️ Created additional signups across shifts");

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

    console.log("🎓 Created training sessions and attendance");

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

    console.log("📢 Created announcements");
  }

  console.log("✅ Seed complete — ka pai!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
