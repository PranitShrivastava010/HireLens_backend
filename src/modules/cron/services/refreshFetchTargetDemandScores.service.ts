import { prisma } from "../../../lib/prisma";

export const refreshFetchTargetDemandScores = async () => {
  const targets: Array<{
    id: string;
    demandScore: number;
    roles: Array<{ roleId: string }>;
  }> = await prisma.jobFetchTarget.findMany({
    select: {
      id: true,
      demandScore: true,
      roles: {
        select: {
          roleId: true,
        },
      },
    },
  });

  const updates = await Promise.allSettled(
    targets.map(async (target) => {
      const roleIds = target.roles.map((role) => role.roleId);
      const demandScore = roleIds.length
        ? await prisma.userRolePreference.count({
            where: {
              roleId: {
                in: roleIds,
              },
            },
          })
        : 0;

      if (demandScore === target.demandScore) {
        return;
      }

      await prisma.jobFetchTarget.update({
        where: { id: target.id },
        data: { demandScore },
      });
    })
  );

  const failures = updates.filter((result) => result.status === "rejected");

  if (failures.length) {
    console.error(
      `[fetch cron] failed to refresh demand scores for ${failures.length} target(s)`,
      failures.map((result) =>
        result.status === "rejected" ? result.reason : undefined
      )
    );
  }
};
