import { Prisma } from "@prisma/client";

export const chunkArray = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

export const addMinutes = (date: Date, minutes: number) => {
  return new Date(date.getTime() + minutes * 60 * 1000);
};

export const calculateBackoffMinutes = (failureCount: number) => {
  if (failureCount <= 1) {
    return 30;
  }

  if (failureCount === 2) {
    return 60;
  }

  if (failureCount === 3) {
    return 180;
  }

  return 360;
};

export const getPositiveInt = (rawValue: string | undefined, fallback: number) => {
  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const isRetryableCronDbError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P1001";
  }

  if (error instanceof Error) {
    return (
      error.message.includes("Can't reach database server") ||
      error.message.includes("Connection terminated unexpectedly") ||
      error.message.includes("Connection error")
    );
  }

  return false;
};

type RetryOptions = {
  attempts?: number;
  delayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
};

export const withRetry = async <T>(
  operation: () => Promise<T>,
  {
    attempts = 3,
    delayMs = 1500,
    shouldRetry = isRetryableCronDbError,
  }: RetryOptions = {}
) => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === attempts || !shouldRetry(error)) {
        throw error;
      }

      await sleep(delayMs * attempt);
    }
  }

  throw lastError;
};
