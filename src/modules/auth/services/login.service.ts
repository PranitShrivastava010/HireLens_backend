import { prisma } from "../../../lib/prisma";
import { comparePassword } from "../../../utils/hashPassword";
import { generateAccessToken, generateRefreshToken } from "../../../utils/jwt";

export const loginService = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ 
    where: { email }, 
    select: {id: true, email: true, name: true, password: true, isVerified: true, hasCompletedPref: true, authProvider: true} 
  });

  if (!user) throw new Error("User not found");
  if (!user.isVerified) throw new Error("User not verified");

  if (user.authProvider === 'GOOGLE' && !user.password) {
    throw new Error("This email is registered using Google. Please sign in with Google.");
  }

  if (!user.password) {
    throw new Error("Password is required to sign in with email.");
  }

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

  const sendUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    hasCompletedPref: user.hasCompletedPref
  };

  return { accessToken, refreshToken, sendUser };
};
