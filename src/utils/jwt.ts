import jwt from "jsonwebtoken";
import { JWT_CONFIG } from "../config/jwtConfig";
import { randomUUID } from "crypto";

export const generateAccessToken = (userId: string) => {
  return jwt.sign(
    { userId },
    JWT_CONFIG.ACCESS_SECRET,
    { expiresIn: "1d" }
  );
};

export const generateRefreshToken = (userId: string) => {
  return jwt.sign(
    {
      userId,
      jti: randomUUID(), // 🔥 guarantees uniqueness
    },
    JWT_CONFIG.REFRESH_SECRET,
    { expiresIn: "7d" }
  );
};
