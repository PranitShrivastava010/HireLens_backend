import { groq } from "../config/groq";
import { safeParseJSON } from "./safeParseJson";

export const matchResumeWithJobGroq = async ({
  matched,
  missing,
  resumeText,
}: {
  matched: string[];
  missing: string[];
  resumeText: string;
}) => {
  const prompt = `
You are an ATS scoring engine.

RULES (STRICT):
- Return ONLY valid JSON
- Do NOT include explanations
- Do NOT include markdown
- Do NOT include text outside JSON
- If unsure, still return valid JSON

ALREADY MATCHED SKILLS:
${matched.join(", ")}

MISSING SKILLS:
${missing.join(", ")}

RESUME TEXT:
${resumeText}

TASK:
1. You may ONLY reclassify atomic skills (exact technologies)
2. NEVER reclassify category skills such as:
   - Front-end technologies
   - Database management
   - Cloud services
   - Deployment strategies
   - Agile mindset
3. Do NOT infer umbrellas or abstractions
4. Do NOT invent skills

OUTPUT FORMAT (JSON ONLY):
{
  "score": number,
  "finalMatched": string[],
  "finalMissing": string[]
}
`;


  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("AI response missing");

  const parsed = safeParseJSON(content);
  if (!parsed) {
    throw new Error("AI returned non-JSON response");
  }

  // ✅ strict validation
  if (
    typeof parsed.score !== "number" ||
    !Array.isArray(parsed.finalMatched) ||
    !Array.isArray(parsed.finalMissing)
  ) {
    throw new Error("Invalid ATS AI response structure");
  }

  return parsed;
};
