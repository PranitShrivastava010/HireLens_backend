import { prisma } from "../../../lib/prisma";
import crypto from "crypto";
import { generateAccessToken, generateRefreshToken } from "../../../utils/jwt";
import { compareOtp } from "../../../utils/otp";
import { ERROR_MESSAGES } from "../../../constants";

export const verifyOtpService = async (email: string, otp: string) => {
  const record = await prisma.otp.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });

  if (!record) throw new Error("OTP not found");
  if (record.expiresAt < new Date()) throw new Error("OTP expired");

  const isValid = compareOtp(otp, record.otp);
  if (!isValid) throw new Error("Invalid OTP");

  const user = await prisma.user.update({
    where: { email },
    data: { isVerified: true },
    select: {
      id: true,
      email: true,
      name: true
    }
  });

  await prisma.otp.deleteMany({ where: { email } });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.userToken.create({
    data: {
      userId: user.id,
      refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const sendUser = {
    id: user.id,
    email: user.email,
    name: user.name
  };

  return { accessToken, refreshToken, sendUser };
};