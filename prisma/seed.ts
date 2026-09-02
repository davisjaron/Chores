import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log("Database already seeded, skipping.");
    return;
  }

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "password123";
  const password = await bcrypt.hash(adminPassword, 10);
  await prisma.user.create({
    data: {
      email: "admin",
      password,
      name: "Admin",
    },
  });

  const kidPin = await bcrypt.hash("1234", 10);

  const emma = await prisma.child.create({
    data: {
      name: "Emma",
      color: "#ef4444",
      age: 8,
      pin: kidPin,
      active: true,
    },
  });

  const liam = await prisma.child.create({
    data: {
      name: "Liam",
      color: "#3b82f6",
      age: 11,
      pin: kidPin,
      active: true,
    },
  });

  await prisma.child.create({
    data: {
      name: "Ava",
      color: "#22c55e",
      age: 6,
      pin: kidPin,
      active: true,
    },
  });

  await prisma.chore.createMany({
    data: [
      {
        name: "Empty & Load Dishwasher",
        points: 10,
        cashValue: 1.0,
        allowConcurrent: true,
        active: true,
        maxClaimsPerDay: 2,
        maxClaimsPerWeek: 10,
      },
      {
        name: "Handwash Dishes After Dinner",
        points: 8,
        active: true,
        maxClaimsPerDay: 1,
        maxConsecutivePerKid: 2,
      },
      {
        name: "Take out trash",
        points: 5,
        minAge: 10,
        active: true,
        maxClaimsPerDay: 1,
      },
      {
        name: "Sweep/Vacuum",
        points: 7,
        active: true,
        maxClaimsPerWeek: 5,
      },
      {
        name: "Tidy Main Level",
        points: 4,
        maxAge: 9,
        active: true,
        maxConsecutivePerKid: 3,
      },
    ],
  });

  await prisma.reward.createMany({
    data: [
      { name: "$5 allowance", pointCost: 50, emoji: "💰", active: true },
      { name: "30 min screen time", pointCost: 20, emoji: "🎮", active: true },
      { name: "Choose movie night", pointCost: 15, emoji: "🎬", active: true },
      { name: "Ice cream treat", pointCost: 10, emoji: "🍦", active: true },
    ],
  });

  await prisma.scheduleSetting.create({
    data: {
      id: "default",
      startDate: new Date().toISOString().slice(0, 10),
      mode: "claim",
      allowSameDay: false,
      cashPerPoint: null,
    },
  });

  console.log("Seed complete!");
  console.log(`Parent login: admin / ${adminPassword}`);
  console.log("Kid PIN for all children: 1234");
  console.log(`Sample children: Emma (${emma.id}), Liam (${liam.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
