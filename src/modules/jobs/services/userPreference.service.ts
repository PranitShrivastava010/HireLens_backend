import { redis } from "../../../config/redis";
import { prisma } from "../../../lib/prisma";

type RoleId = { id: string };
type SkillId = { id: string };

export const saveUserPreferencesService = async ({
    userId,
    roleSlugs,
    skillSlugs,
}: {
    userId: string;
    roleSlugs: string[];
    skillSlugs: string[];
}) => {

    const roles: RoleId[] = await prisma.role.findMany({
        where: { slug: { in: roleSlugs } },
        select: { id: true },
    });

    const skills: SkillId[] = await prisma.skill.findMany({
        where: { slug: { in: skillSlugs } },
        select: { id: true },
    });


    const ops: any[] = [
        prisma.userRolePreference.deleteMany({ where: { userId } }),
        prisma.userSkillPreference.deleteMany({ where: { userId } }),
    ];

    if (roles.length) {
        ops.push(
            prisma.userRolePreference.createMany({
                data: roles.map(r => ({ userId, roleId: r.id })),
            })
        );
    }

    if (skills.length) {
        ops.push(
            prisma.userSkillPreference.createMany({
                data: skills.map(s => ({ userId, skillId: s.id })),
            })
        );
    }

    await prisma.$transaction(ops);

    try {
        let cursor = 0;
        do {
            const res = await redis.scan(cursor, {
                match: `job:feed:${userId}:*`,
                count: 100,
            });

            cursor = Number(res[0]);
            const keys = res[1];

            if (keys.length) {
                await redis.del(...keys);
            }
        } while (cursor !== 0);
    } catch (error) {
        console.warn("Failed to clear Redis cache on preference update:", error);
    }

    await prisma.user.update({
        where: { id: userId },
        data: { hasCompletedPref: true }
    })

};
