type ExperienceResult = {
  minExperienceYears?: number;
  maxExperienceYears?: number;
  experienceRaw?: string[];
};

const BLOCK_WORDS = [
  "education",
  "educational",
  "qualification",
  "study",
  "full time",
  "degree"
];

export const extractExperience = (text: string): ExperienceResult => {
  if (!text) return {};

  const normalized = text.toLowerCase().replace(/\n/g, " ");
  const experienceRaw: string[] = [];

  // RANGE: 3 to 5 years
  const rangeRegex = /(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*years?/gi;

  let match;
  while ((match = rangeRegex.exec(normalized))) {
    const context = normalized.slice(
      Math.max(0, match.index - 40),
      match.index + match[0].length + 40
    );

    if (BLOCK_WORDS.some(w => context.includes(w))) continue;

    const min = Number(match[1]);
    const max = Number(match[2]);

    experienceRaw.push(match[0]);
    return { minExperienceYears: min, maxExperienceYears: max, experienceRaw };
  }

  // SINGLE: minimum 3 years, 3+ years
  const singleRegex =
    /(minimum\s*)?(\d+(?:\.\d+)?)(\s*\+)?\s*years?/gi;

  while ((match = singleRegex.exec(normalized))) {
    const context = normalized.slice(
      Math.max(0, match.index - 40),
      match.index + match[0].length + 40
    );

    if (BLOCK_WORDS.some(w => context.includes(w))) continue;

    const value = Number(match[2]);
    experienceRaw.push(match[0]);

    // minimum / + means only min
    if (match[1] || match[3]) {
      return { minExperienceYears: value, experienceRaw };
    }

    return {
      minExperienceYears: value,
      maxExperienceYears: value,
      experienceRaw,
    };
  }

  return {};
};
