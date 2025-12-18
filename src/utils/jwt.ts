import jwt from "jsonwebtoken";
import * as crypto from "crypto";

export const generateAccessToken = (userId: string) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET!,
    { expiresIn: "15m" }
  );
};

export const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString("hex");
};
