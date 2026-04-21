import { prisma } from "../../../lib/prisma";

export const getUserPreferencesService = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      rolePreferences: {
        select: {
          role: { select: { name: true, slug: true } },
        },
      },
      skillPreferences: {
        select: {
          skill: { select: { name: true, slug: true } },
        },
      },
    },
  });
};
