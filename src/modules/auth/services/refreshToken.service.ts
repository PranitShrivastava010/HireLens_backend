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
    // Token already rotated or revoked
    console.warn("Refresh token already used or revoked");
    return null;
  }

  if (storedToken.expiresAt < new Date()) {
    await prisma.userToken.deleteMany({
      where: { refreshToken },
    });
    throw new Error("Refresh token expired");
  }

  try {
    jwt.verify(refreshToken, JWT_CONFIG.REFRESH_SECRET);
  } catch {
    throw new Error("Invalid refresh token");
  }

  if (!storedToken.user.isVerified) {
    throw new Error("User not verified");
  }

  const newAccessToken = generateAccessToken(storedToken.userId);
  const newRefreshToken = generateRefreshToken(storedToken.userId);

  // 🔐 ATOMIC ROTATION
  await prisma.$transaction([
    prisma.userToken.deleteMany({
      where: { refreshToken },
    }),
    prisma.userToken.create({
      data: {
        userId: storedToken.userId,
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: {
      id: storedToken.user.id,
      email: storedToken.user.email,
      name: storedToken.user.name,
    },
  };
};

