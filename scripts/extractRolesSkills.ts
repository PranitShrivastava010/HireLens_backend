import { PrismaClient } from "@prisma/client";
import { extractRolesAndSkillsForJob } from "../src/modules/jobs/services/roleSkill.service";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function run() {
  console.log("🚀 Starting AI Role/Skill extraction from existing jobs...");

  const jobs = await prisma.jobs.findMany({
    select: {
      id: true,
      title: true
    }
  });

  console.log(`📊 Found ${jobs.length} jobs to process.`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    console.log(`[${i + 1}/${jobs.length}] Processing: ${job.title}...`);

    try {
      await extractRolesAndSkillsForJob(job.id);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed for ${job.title}:`, error);
      failCount++;
    }
    
    // Small delay to avoid aggressive rate limiting if any
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log("\n✅ Extraction complete!");
  console.log(`- Successfully processed: ${successCount}`);
  console.log(`- Failed: ${failCount}`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
