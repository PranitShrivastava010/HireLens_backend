import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

type Models = keyof PrismaClient;