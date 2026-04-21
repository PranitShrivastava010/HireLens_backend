
import { prisma } from "../lib/prisma";
import { normalizeText, slugify } from "./slugText";


export async function resolveSkill(rawSkill: string) {
  const normalized = normalizeText(rawSkill);
  const slug = slugify(rawSkill);

  // 1️⃣ Try alias match first
  const alias = await prisma.skillAlias.findUnique({
    where: { alias: normalized },
    include: { skill: true },
  });

  if (alias) return alias.skill;

  // 2️⃣ Try slug match (CRITICAL FIX)
  const existingBySlug = await prisma.skill.findUnique({
    where: { slug },
  });

  if (existingBySlug) {
    // ensure alias exists
    await prisma.skillAlias.upsert({
      where: { alias: normalized },
      update: {},
      create: {
        skillId: existingBySlug.id,
        alias: normalized,
      },
    });

    return existingBySlug;
  }

  // 3️⃣ Create skill safely
  try {
    return await prisma.skill.create({
      data: {
        name: rawSkill,
        slug,
        aliases: {
          create: {
            alias: normalized,
          },
        },
      },
    });
  } catch (e: any) {
    // 4️⃣ Handle race condition (double insert)
    if (e.code === "P2002") {
      const fallback = await prisma.skill.findUnique({
        where: { slug },
      });

      if (fallback) return fallback;
    }

    throw e;
  }
}


