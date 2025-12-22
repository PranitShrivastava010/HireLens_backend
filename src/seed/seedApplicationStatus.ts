import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const statuses = [
  { key: "APPLIED", label: "Applied", sortOrder: 1, allowsDate: false },
  { key: "INTERVIEW", label: "Interview", sortOrder: 2, allowsDate: true },
  { key: "REJECTED", label: "Rejected", sortOrder: 3, allowsDate: false },
  { key: "NO_RESPONSE", label: "No Response", sortOrder: 4, allowsDate: false },
  { key: "OFFER", label: "Offer", sortOrder: 5, allowsDate: false },
  { key: "SAVED", label: "Saved", sortOrder: 6, allowsDate: false}
];

async function seed() {
  for (const status of statuses) {
    await prisma.applicationStatus.upsert({
      where: { key: status.key },
      update: {},
      create: status,
    });
  }

  console.log("✅ Application statuses seeded");
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
