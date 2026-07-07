import { prisma } from "../../../lib/prisma";

export const logoutService = async (refreshToken: string) => {
  await prisma.userToken.deleteMany({
    where: { refreshToken },
  });
  return { success: true };
};
