import { prisma } from "../../../lib/prisma";
import { comparePassword } from "../../../utils/hashPassword";
import { generateAccessToken, generateRefreshToken } from "../../../utils/jwt";

export const loginService = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) throw new Error("User not found");
  if (!user.isVerified) throw new Error("User not verified");

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) throw new Error("Invalid credentials");

  await prisma.userToken.deleteMany({
    where: { userId: user.id },
  });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.userToken.create({
    data: {
      userId: user.id,
      refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken, refreshToken, user };
};
