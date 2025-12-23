import { normalize } from "./normalizeResume";

type JobKeyword = {
  keyword: string;
  type: "ATOMIC" | "CATEGORY" | "CONCEPT";
  aliases?: string[];
  score: number;
};


export const hardMatchKeywords = (
  jobKeywords: JobKeyword[],
  resumeText: string
) => {
  const resume = normalize(resumeText);

  const matched: string[] = [];
  const missing: string[] = [];

  for (const k of jobKeywords) {
    const keyword = normalize(k.keyword);
    const aliases = k.aliases ?? [];

    // ATOMIC → exact match
    if (k.type === "ATOMIC") {
      if (resume.includes(keyword)) matched.push(k.keyword);
      else missing.push(k.keyword);
      continue;
    }

    // CATEGORY / CONCEPT → alias match
    const hasAlias = aliases.some(alias =>
      resume.includes(normalize(alias))
    );

    if (hasAlias) matched.push(k.keyword);
    else missing.push(k.keyword);
  }

  return { matched, missing };
};


