import { prisma } from "../../../lib/prisma";
import { groq } from "../../../config/groq";
import { resolveSkill } from "../../../utils/resolveSkills";
import { resolveRole } from "../../../utils/resolveRole";

interface ExtractResult {
  roles: string[];
  skills: string[];
}

const DEFAULT_ENRICH_DESCRIPTION_MAX_CHARS = 3500;
const DEFAULT_ENRICH_AI_TIMEOUT_MS = 12000;
const DEFAULT_ENRICH_MAX_TOKENS = 180;

function extractJSON(text: string): unknown | null {
  const match = text.match(/\{[\s\S]*\}/);

  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

const sanitizeDescription = (description: string, maxChars: number) => {
  return description.replace(/\s+/g, " ").trim().slice(0, maxChars);
};

const uniqueList = (values: string[], limit: number, maxLength: number) => {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 1 && value.length <= maxLength)
    )
  ).slice(0, limit);
};

export const extractRolesAndSkillsForJob = async (
  jobId: string
): Promise<ExtractResult> => {
  const job = await prisma.jobs.findUnique({
    where: { id: jobId },
    select: { title: true, description: true },
  });

  if (!job?.description) {
    throw new Error("Job not found or description missing");
  }

  const maxDescriptionChars =
    Number(process.env.JOB_ENRICH_DESCRIPTION_MAX_CHARS) ||
    DEFAULT_ENRICH_DESCRIPTION_MAX_CHARS;
  const aiTimeoutMs =
    Number(process.env.JOB_ENRICH_AI_TIMEOUT_MS) || DEFAULT_ENRICH_AI_TIMEOUT_MS;
  const maxTokens =
    Number(process.env.JOB_ENRICH_AI_MAX_TOKENS) || DEFAULT_ENRICH_MAX_TOKENS;
  const trimmedDescription = sanitizeDescription(
    job.description,
    maxDescriptionChars
  );

  const prompt = `Extract job roles and technical skills from this job post.

Return valid JSON only.

Rules:
- roles: max 5 concise role names
- skills: max 12 technical skills
- no sentences
- no explanations
- no markdown

Job title: ${job.title}
Job description: ${trimmedDescription}

{
  "roles": ["Role1", "Role2"],
  "skills": ["Skill1", "Skill2"]
}`;

  const completion = await groq.chat.completions.create(
    {
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    },
    {
      signal: AbortSignal.timeout(aiTimeoutMs),
    }
  );

  const raw = completion.choices[0]?.message?.content;

  if (!raw) {
    return { roles: [], skills: [] };
  }

  const parsed = extractJSON(raw) as
    | { roles?: unknown; skills?: unknown }
    | null;

  if (!parsed) {
    console.log("failed to parse AI response", raw);
    return { roles: [], skills: [] };
  }

  const rolesRaw: string[] = Array.isArray(parsed.roles) ? parsed.roles : [];
  const skillsRaw: string[] = Array.isArray(parsed.skills) ? parsed.skills : [];

  const roles = uniqueList(rolesRaw, 5, 40);
  const skills = uniqueList(skillsRaw, 12, 50);

  await Promise.all(
    roles.map(async (roleName) => {
      const role = await resolveRole(roleName);

      await prisma.jobRole.upsert({
        where: {
          jobId_roleId: {
            jobId,
            roleId: role.id,
          },
        },
        update: {},
        create: {
          jobId,
          roleId: role.id,
        },
      });
    })
  );

  await Promise.all(
    skills.map(async (skillName) => {
      const skill = await resolveSkill(skillName);

      await prisma.jobSkill.upsert({
        where: {
          jobId_skillId: {
            jobId,
            skillId: skill.id,
          },
        },
        update: {},
        create: {
          jobId,
          skillId: skill.id,
        },
      });
    })
  );

  return { roles, skills };
};
