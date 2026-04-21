import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { normalizeText, slugify } from "./slugText";


export async function resolveRole(rawRole: string) {
  const normalized = normalizeText(rawRole);

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const alias = await tx.roleAlias.findUnique({
      where: { alias: normalized },
      include: { role: true },
    });
    if (alias) return alias.role;

    const existing = await tx.role.findFirst({
      where: { name: { equals: rawRole, mode: "insensitive" } },
    });

    if (existing) {
      await tx.roleAlias.create({
        data: { roleId: existing.id, alias: normalized },
      });
      return existing;
    }

    return tx.role.create({
      data: {
        name: rawRole,
        slug: slugify(rawRole),
        aliases: { create: { alias: normalized } },
      },
    });
  });
}
