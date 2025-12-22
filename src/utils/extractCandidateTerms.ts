import natural from "natural";
import { removeStopwords } from "stopword";

const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

// Custom tech stopwords (very important)
const CUSTOM_STOPWORDS = [
  "experience",
  "years",
  "role",
  "job",
  "skills",
  "candidate",
  "responsibilities",
  "requirements",
  "ability",
  "work",
  "team",
  "using",
];

export const extractCandidateTerms = (
  text: string,
  limit = 15
): { keyword: string; score: number }[] => {
  if (!text) return [];

  // 1. Normalize
  const cleanText = text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, " ");

  // 2. Tokenize
  const tokens = tokenizer.tokenize(cleanText) || [];

  // 3. Remove stopwords
  const filteredTokens = removeStopwords(tokens, CUSTOM_STOPWORDS);

  // 4. Build document
  const tfidf = new TfIdf();
  tfidf.addDocument(filteredTokens.join(" "));

  const keywords: { keyword: string; score: number }[] = [];

  // 5. Extract scores
  tfidf.listTerms(0).forEach((item) => {
    if (item.term.length > 2) {
      keywords.push({
        keyword: item.term,
        score: Number(item.tfidf.toFixed(4)),
      });
    }
  });

  // 6. Return top keywords
  return keywords
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};
