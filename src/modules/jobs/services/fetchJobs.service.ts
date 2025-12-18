import axios from "axios";
import { prisma } from "../../../lib/prisma";
import { extractExperience } from "../../../utils/extractExperience";
import { extractSalaryFromDescription } from "../../../utils/extractSalary";
import { extractQualifications } from "../../../utils/extractEducation";
import { extractLocationFromDescription } from "../../../utils/extractLocation";

const RAPID_API_URL = "https://jsearch.p.rapidapi.com/search";

export const fetchJobsFromApi = async (query: string, page = 1) => {
  const options = {
    method: "GET",
    url: RAPID_API_URL,
    params: {
      query,
      page,
      num_pages: "1",
      country: "in",
      date_posted: "all",
    },
    headers: {
      "x-rapidapi-key": process.env.RAPIDAPI_KEY!,
      "x-rapidapi-host": process.env.RAPIDAPI_HOST!,
    },
  };

  const response = await axios.request(options);

  const jobs = response.data?.data || [];

  for (const job of jobs) {

    const description = job.job_description ?? "";

    const experience = extractExperience(description);
    const salary = extractSalaryFromDescription(description);
    const extractedLocation =
      job.job_city && job.job_state
        ? {}
        : extractLocationFromDescription(description);

    await prisma.jobs.upsert({
      where: {
        providerJobId: job.job_id,
      },
      update: {},
      create: {
        providerJobId: job.job_id,
        providerName: job.job_publisher,

        title: job.job_title,
        description: job.job_description,
        employmentType: job.job_employment_type,
        isRemote: job.job_is_remote ?? false,

        companyName: job.employer_name,
        companyLogo: job.employer_logo,
        companyWebsite: job.employer_website,

        location: job.job_location,
        city: job.job_city ?? extractedLocation.city ?? null,
        state: job.job_state ?? extractedLocation.state ?? null,
        country: job.job_country ?? extractedLocation.country ?? null,

        applyUrl: job.job_apply_link,

        minSalary: job.job_min_salary ?? salary.min ?? null,
        maxSalary: job.job_max_salary ?? salary.max ?? null,
        salaryPeriod: job.job_salary_period ?? salary.period ?? null,

        postedAt: job.job_posted_at,
        postedAtUtc: job.job_posted_at_datetime_utc
          ? new Date(job.job_posted_at_datetime_utc)
          : null,

        experienceRaw: experience.experienceRaw ?? [],
        minExperienceYears: experience.minExperienceYears ?? null,
        maxExperienceYears: experience.maxExperienceYears ?? null,

        qualifications: extractQualifications(description),

        responsibilities:
          job.job_highlights?.Responsibilities ?? [],
      },
    });
  }

  return {
    totalFetched: jobs.length,
  };
};
