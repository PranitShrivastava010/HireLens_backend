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
