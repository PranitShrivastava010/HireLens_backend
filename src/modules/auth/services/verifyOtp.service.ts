import { prisma } from "../../../lib/prisma";
import crypto from "crypto";
import { generateAccessToken, generateRefreshToken } from "../../../utils/jwt";

export const verifyOtp = async (email: string, otp: string) => {
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  const otpRecord = await prisma.otp.findFirst({
    where: { email, otp: hashedOtp },
  });

  if (!otpRecord || otpRecord.expiresAt < new Date()) {
    throw new Error("Invalid or expired OTP");
  }

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    user = await prisma.user.create({
      data: { email, name: email.split("@")[0] },
    });
  }

  await prisma.otp.deleteMany({ where: { email } });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken();

  await prisma.userToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken, refreshToken, user };
};
