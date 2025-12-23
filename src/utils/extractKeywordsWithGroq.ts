import { groq } from "../config/groq";

interface CandidateTerm {
  keyword: string;
  score: number;
}

export type ExtractedJobKeyword = {
  keyword: string;
  score: number;
  type: "ATOMIC" | "CATEGORY" | "CONCEPT";
  aliases?: string[];
};


export const extractKeywordsWithGroq = async ({
  jobTitle,
  jobDescription,
  candidateTerms,
}: {
  jobTitle: string;
  jobDescription: string;
  candidateTerms: CandidateTerm[];
}): Promise<ExtractedJobKeyword[]> => {
  const prompt = `
You are an ATS optimization expert.

Job Title:
${jobTitle}

Job Description:
${jobDescription}

Candidate extracted terms:
${candidateTerms.map((t) => t.keyword).join(", ")}

TASK:
1. Extract ONLY technical skills from the job description
2. Classify each skill as one of:
   - ATOMIC: single concrete technology (e.g. React, SQL Server, ASP.NET MVC)
   - CATEGORY: group of technologies (e.g. Front-end technologies)
   - CONCEPT: methodology or approach (e.g. Agile, Cloud-first)
3. For CATEGORY or CONCEPT skills, provide aliases (signals) that prove presence
4. Remove soft skills and filler words
5. Merge duplicates
6. Return max 12 skills
7. Assign relevance score between 0 and 1

FORMAT (JSON ONLY):
[
  {
    "keyword": "Skill name",
    "type": "ATOMIC | CATEGORY | CONCEPT",
    "aliases": ["alias1", "alias2"],
    "score": 0.95
  }
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
