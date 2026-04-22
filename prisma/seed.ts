import { PrismaClient } from "@prisma/client";
import { CANONICAL_FETCH_TARGETS } from "../src/modules/cron/constants/fetchTargets";
import { normalizeText, slugify } from "../src/utils/slugText";

const prisma = new PrismaClient();

const statuses = [
  { key: "APPLIED", label: "Applied", sortOrder: 1, allowsDate: false },
  { key: "INTERVIEW", label: "Interview", sortOrder: 2, allowsDate: true },
  { key: "REJECTED", label: "Rejected", sortOrder: 3, allowsDate: false },
  { key: "NO_RESPONSE", label: "No Response", sortOrder: 4, allowsDate: false },
  { key: "OFFER", label: "Offer", sortOrder: 5, allowsDate: false },
  { key: "SAVED", label: "Saved", sortOrder: 6, allowsDate: false },
];

async function seedStatuses() {
  for (const status of statuses) {
    await prisma.applicationStatus.upsert({
      where: { key: status.key },
      update: {},
      create: status,
    });
  }
}

async function seedFetchTargets() {
  const roleIdsByName = new Map<string, string>();

  for (const target of CANONICAL_FETCH_TARGETS) {
    for (const roleName of target.roleNames) {
      const slug = slugify(roleName);

      const role = await prisma.role.upsert({
        where: { slug },
        update: {
          name: roleName,
        },
        create: {
          name: roleName,
          slug,
        },
      });

      await prisma.roleAlias.upsert({
        where: { alias: normalizeText(roleName) },
        update: {
          roleId: role.id,
        },
        create: {
          roleId: role.id,
          alias: normalizeText(roleName),
        },
      });

      roleIdsByName.set(roleName, role.id);
    }
  }

  for (const target of CANONICAL_FETCH_TARGETS) {
    const seededTarget = await prisma.jobFetchTarget.upsert({
      where: { query: target.query },
      update: {
        name: target.name,
        category: target.category,
        isActive: true,
        priority: target.priority,
        refreshEveryMinutes: target.refreshEveryMinutes,
      },
      create: {
        name: target.name,
        query: target.query,
        category: target.category,
        isActive: true,
        priority: target.priority,
        refreshEveryMinutes: target.refreshEveryMinutes,
        nextRunAt: new Date(),
      },
    });

    for (const roleName of target.roleNames) {
      const roleId = roleIdsByName.get(roleName);

      if (!roleId) {
        continue;
      }

      await prisma.jobFetchTargetRole.upsert({
        where: {
          targetId_roleId: {
            targetId: seededTarget.id,
            roleId,
          },
        },
        update: {},
        create: {
          targetId: seededTarget.id,
          roleId,
        },
      });
    }
  }
}

async function seed() {
  await seedStatuses();
  await seedFetchTargets();

  console.log("Application statuses seeded");
  console.log(`Canonical fetch targets seeded: ${CANONICAL_FETCH_TARGETS.length}`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
