import jwt from "jsonwebtoken";
import { prisma } from "../../../lib/prisma";
import { JWT_CONFIG } from "../../../config/jwtConfig";
import { generateAccessToken, generateRefreshToken } from "../../../utils/jwt";

export type RefreshTokenResponse = 
  | { 
      success: true; 
      data: {
        accessToken: string;
        refreshToken: string;
        user: {
          id: string;
          email: string;
          name: string;
          hasCompletedPref: boolean;
        };
      };
    }
  | { 
      success: false; 
      message: string; 
      statusCode: number; 
    };

export const refreshTokenService = async (refreshToken: string): Promise<RefreshTokenResponse> => {
  if (!refreshToken) {
    return { success: false, message: "Refresh token required", statusCode: 401 };
  }

  const storedToken = await prisma.userToken.findUnique({
    where: { refreshToken },
    include: { user: true },
  });

  if (!storedToken) {
    // Token already rotated or revoked
    console.warn(`[RefreshTokenService] Token not found or already used: ${refreshToken.substring(0, 10)}...`);
    return { success: false, message: "Refresh token invalid or already used", statusCode: 401 };
  }

  if (storedToken.expiresAt < new Date()) {
    await prisma.userToken.deleteMany({
      where: { refreshToken },
    });
    return { success: false, message: "Refresh token expired", statusCode: 401 };
  }

  try {
    jwt.verify(refreshToken, JWT_CONFIG.REFRESH_SECRET);
  } catch {
    return { success: false, message: "Invalid refresh token", statusCode: 401 };
  }

  if (!storedToken.user.isVerified) {
    return { success: false, message: "User not verified", statusCode: 403 };
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
    success: true,
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: storedToken.user.id,
        email: storedToken.user.email,
        name: storedToken.user.name,
        hasCompletedPref: storedToken.user.hasCompletedPref
      }
    }
  };
};

