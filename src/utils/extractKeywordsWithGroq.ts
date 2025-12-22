import { groq } from "../config/groq";

interface CandidateTerm {
  keyword: string;
  score: number;
}

export const extractKeywordsWithGroq = async ({
  jobTitle,
  jobDescription,
  candidateTerms,
}: {
  jobTitle: string;
  jobDescription: string;
  candidateTerms: CandidateTerm[];
}): Promise<{ keyword: string; score: number }[]> => {
  const prompt = `
You are an ATS optimization expert.

Job Title:
${jobTitle}

Job Description:
${jobDescription}

Candidate extracted terms:
${candidateTerms.map((t) => t.keyword).join(", ")}

TASK:
1. Return the MOST important technical skills only
2. Remove soft skills and filler words
3. Merge similar skills
4. Return max 12 skills
5. Assign relevance score between 0 and 1

FORMAT (JSON ONLY):
[
  { "keyword": "Skill Name", "score": 0.95 }
]
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content:
          "You are an API. You ONLY return valid JSON. No text. No explanation.",
      },
      {
        role: "user",
        content: prompt + "\n\nReturn ONLY valid JSON array.",
      },
    ],
    temperature: 0,
  });


  const content = completion.choices[0]?.message?.content;

  if (!content) return [];

  try {
    const json = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(json);
  } catch (err) {
    console.error("Groq JSON parse failed:", content);
    return [];
  }

};
