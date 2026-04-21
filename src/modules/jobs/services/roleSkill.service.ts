import { prisma } from "../../../lib/prisma";
import { groq } from "../../../config/groq";
import { resolveSkill } from "../../../utils/resolveSkills";
import { resolveRole } from "../../../utils/resolveRole";

interface ExtractResult {
  roles: string[];
  skills: string[];
}

function extractJSON(text: string): any | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}


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

  const prompt = `
You are an AI recruiter assistant.

Job title:
${job.title}

Job description:
${job.description}

TASK:
1. Extract ONLY job roles (e.g. "Backend Developer", "Node.js Developer")
2. Extract ONLY technical skills (e.g. "Node.js", "Express", "MongoDB")
3. Do NOT include responsibilities or sentences
4. Max 5 roles, max 12 skills
5. Return JSON ONLY in this exact format:

{
  "roles": ["Role1", "Role2"],
  "skills": ["Skill1", "Skill2"]
}
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return { roles: [], skills: [] };

  const parsed = extractJSON(raw);
  
  if (!parsed) {
    console.log("📢 failed to parse AI response", raw);
    return { roles: [], skills: [] };
  }

  const rolesRaw: string[] = Array.isArray(parsed.roles) ? parsed.roles : [];
  const skillsRaw: string[] = Array.isArray(parsed.skills) ? parsed.skills : [];

  // ❗ Filter out sentences pretending to be roles
  const roles = rolesRaw
    .map(r => r.trim())
    .filter(r => r.length > 2 && r.length < 40);

  const skills = skillsRaw
    .map(s => s.trim())
    .filter(Boolean);

  // ✅ Save roles
  for (const roleName of roles) {
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
  }

  // ✅ Save skills
  for (const skillName of skills) {
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
  }

  return { roles, skills };
};
