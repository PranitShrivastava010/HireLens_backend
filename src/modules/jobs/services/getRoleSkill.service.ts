import { Role, Skill } from "@prisma/client";
import { prisma } from "../../../lib/prisma";

export const getRoleSkillService = async ({
  query,
  limit = 10,
}: {
  query: string;
  limit?: number;
}) => {
  if (!query || query.length < 1) return [];

  const [roles, skills] = await Promise.all([
    prisma.role.findMany({
      where: {
        name: { startsWith: query, mode: "insensitive" },
      },
      take: limit,
    }),

    prisma.skill.findMany({
      where: {
        name: { startsWith: query, mode: "insensitive" },
      },
      take: limit,
    }),
  ]);

  return [
    ...roles.map((r: Role) => ({
      type: "role" as const,
      label: r.name,
      value: r.slug,
    })),
    ...skills.map((s: Skill) => ({
      type: "skill" as const,
      label: s.name,
      value: s.slug,
    })),
  ].slice(0, limit);
};
