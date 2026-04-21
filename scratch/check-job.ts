import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  const jobs = await prisma.jobs.findMany();
  jobs.forEach(job => {
    console.log(`Title: ${job.title} | Desc Length: ${job.description?.length}`);
  });
}

check().finally(() => prisma.$disconnect());
