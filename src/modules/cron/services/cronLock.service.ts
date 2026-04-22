import { redis } from "../../../config/redis";

type CronLock = {
  acquired: boolean;
  token: string;
};

export const acquireCronLock = async (
  lockKey: string,
  ttlSeconds: number
): Promise<CronLock> => {
  const token = `${lockKey}:${Date.now()}`;
  const result = await redis.set(lockKey, token, { nx: true, ex: ttlSeconds });

  return {
    acquired: result === "OK",
    token,
  };
};

export const releaseCronLock = async (lockKey: string) => {
  await redis.del(lockKey);
};
