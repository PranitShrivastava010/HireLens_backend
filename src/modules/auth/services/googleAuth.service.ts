import { OAuth2Client } from "google-auth-library";
import { prisma } from "../../../lib/prisma";
import { generateAccessToken, generateRefreshToken } from "../../../utils/jwt";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuthService = async (idToken: string) => {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  
  const payload = ticket.getPayload();
  
  if (!payload || !payload.email) {
    throw new Error("Invalid Google token payload");
  }

  const { email, name, sub: googleId } = payload;

  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: name || "Google User",
        googleId,
        authProvider: "GOOGLE",
        isVerified: true,
      },
    });
  } else {
    if (!user.googleId) {
      user = await prisma.user.update({
        where: { email },
        data: {
          googleId,
          authProvider: "GOOGLE",
          isVerified: true, 
        },
      });
    }
  }

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
    hasCompletedPref: user.hasCompletedPref,
  };

  return { accessToken, refreshToken, sendUser };
};
