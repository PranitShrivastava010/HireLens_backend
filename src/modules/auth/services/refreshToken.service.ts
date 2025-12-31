import jwt from "jsonwebtoken";
import { prisma } from "../../../lib/prisma";
import { JWT_CONFIG } from "../../../config/jwtConfig";
import { generateAccessToken, generateRefreshToken } from "../../../utils/jwt";

export const refreshTokenService = async (refreshToken: string) => {
  if (!refreshToken) {
    throw new Error("Refresh token required");
  }

  const storedToken = await prisma.userToken.findUnique({
    where: { refreshToken },
    include: { user: true },
  });

  if (!storedToken) {
    throw new Error("Refresh token revoked");
  }

  if (storedToken.expiresAt < new Date()) {
    await prisma.userToken.delete({ where: { refreshToken } });
    throw new Error("Refresh token expired");
  }

  let payload: any;
  try {
    payload = jwt.verify(refreshToken, JWT_CONFIG.REFRESH_SECRET);
  } catch {
    throw new Error("Invalid or expired refresh token");
  }


  if (!storedToken.user.isVerified) {
    throw new Error("User not verified");
  }

  const newAccessToken = generateAccessToken(storedToken.userId);
  const newRefreshToken = generateRefreshToken(storedToken.userId);

  await prisma.userToken.delete({
    where: { refreshToken },
  });

  await prisma.userToken.create({
    data: {
      userId: storedToken.userId,
      refreshToken: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const user = {
    id: storedToken.user.id,
    email: storedToken.user.email,
    name: storedToken.user.name
  }

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: user
  };
};
