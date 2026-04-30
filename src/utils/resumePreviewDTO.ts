/**
 * ResumePreviewDTO.ts
 * Data Transfer Object for presentation-ready resume data
 * Safe for frontend rendering, PDF export, and ATS scoring
 */

/**
 * Contact information within the resume
 */
interface ContactLink {
  label: string; // "linkedin", "github", etc.
  url: string;
}

interface Contact {
  email: string;
  phone: string;
  location: string;
  links: ContactLink[];
}

/**
 * Resume Basics section
 */
interface ResumeBasicsDTO {
  fullName: string;
  headline: string;
  summary: string;
  contact: Contact;
}

/**
 * Experience entry with formatted duration
 */
interface ExperienceDTO {
  id: string;
  company: string;
  role: string;
  location: string;
  duration: string; // e.g., "Jan 2020 - Present" or "Jan 2020 - Dec 2021"
  startDate: string; // ISO date string
  endDate: string | null; // ISO date string or null if current
  isCurrent: boolean;
  bullets: string[];
  orderIndex: number;
}

/**
 * Education entry
 */
interface EducationDTO {
  id: string;
  institute: string;
  degree: string;
  field: string;
  duration: string; // e.g., "2018 - 2022"
  startYear: number;
  endYear: number | null;
}

/**
 * Project entry
 */
interface ProjectDTO {
  id: string;
  name: string;
  description: string;
  techStack: string[];
  link: string;
  dateLabel: string;
}

/**
 * Skill entry
 */
interface SkillDTO {
  id: string;
  name: string;
  level: string; // "Beginner", "Intermediate", "Expert"
  category: string; // "Backend", "Frontend", "DevOps", etc.
}

/**
 * Certification entry
 */
interface CertificationDTO {
  id: string;
  name: string;
  issuer: string;
  year: number | null;
  link: string;
}

/**
 * Sections container holding all resume sections
 */
interface ResumeSections {
  experience: ExperienceDTO[];
  education: EducationDTO[];
  projects: ProjectDTO[];
  skills: SkillDTO[];
  certifications: CertificationDTO[];
}

interface ResumeSectionVisibilityDTO {
  summary: boolean;
  experience: boolean;
  education: boolean;
  projects: boolean;
  skills: boolean;
  certifications: boolean;
}

interface ResumeLayoutSettingsDTO {
  pageMode: string;
  density: string;
  fontSize: number | null;
  lineHeight: number | null;
  pagePaddingTop: number | null;
  pagePaddingBottom: number | null;
  pagePaddingX: number | null;
  sectionSpacing: number | null;
  itemSpacing: number | null;
  bulletSpacing: number | null;
}

/**
 * Complete Resume Preview DTO
 * Independent of Prisma models - safe for rendering and export
 */
export interface ResumePreviewDTO {
  id: string;
  title: string;
  lastUpdated: string; // ISO date string
  basics: ResumeBasicsDTO;
  sections: ResumeSections;
  layoutSettings: ResumeLayoutSettingsDTO | null;
  sectionVisibility: ResumeSectionVisibilityDTO;
}

/**
 * Type-safe mapper function to convert Prisma result to ResumePreviewDTO
 * Normalizes empty values and formats data for frontend consumption
 */
export function mapResumeToPreviewDTO(
  resumeFromDb: {
    id: string;
    title: string | null;
    updatedAt: Date;
    basics: {
      fullName: string;
      headline: string | null;
      summary: string | null;
      email: string | null;
      phone: string | null;
      location: string | null;
      linkedin: string | null;
      github: string | null;
    } | null;
    contactLinks: Array<{
      id: string;
      label: string;
      url: string;
      orderIndex: number;
    }>;
    layoutSettings: {
      pageMode: string | null;
      density: string | null;
      fontSize: number | null;
      lineHeight: number | null;
      pagePaddingTop: number | null;
      pagePaddingBottom: number | null;
      pagePaddingX: number | null;
      sectionSpacing: number | null;
      itemSpacing: number | null;
      bulletSpacing: number | null;
      showSummary: boolean;
      showExperience: boolean;
      showProjects: boolean;
      showSkills: boolean;
      showEducation: boolean;
      showCertifications: boolean;
    } | null;
    experiences: Array<{
      id: string;
      company: string;
      role: string;
      location: string | null;
      startDate: Date;
      endDate: Date | null;
      isCurrent: boolean;
      bullets: string[];
      orderIndex: number;
    }>;
    educations: Array<{
      id: string;
      institute: string;
      degree: string;
      field: string | null;
      startYear: number;
      endYear: number | null;
    }>;
    projects: Array<{
      id: string;
      name: string;
      description: string;
      techStack: string[];
      link: string | null;
      dateLabel: string | null;
    }>;
    skills: Array<{
      id: string;
      name: string;
      level: string | null;
      category: string | null;
    }>;
    certifications: Array<{
      id: string;
      name: string;
      issuer: string;
      year: number | null;
      link: string | null;
    }>;
  }
): ResumePreviewDTO {
  // Helper function to format date range
  const formatDateRange = (
    startDate: Date,
    endDate: Date | null,
    isCurrent: boolean
  ): string => {
    const monthYear = (date: Date): string => {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric",
      }).format(date);
    };

    const start = monthYear(startDate);
    const end = isCurrent ? "Present" : endDate ? monthYear(endDate) : "";

    return `${start} - ${end}`.trim();
  };

  // Helper function to format year range
  const formatYearRange = (startYear: number, endYear: number | null): string => {
    return endYear ? `${startYear} - ${endYear}` : `${startYear}`;
  };

  // Helper function to normalize string values (no undefined)
  const normalizeString = (value: string | null | undefined, fallback: string = ""): string => {
    return value || fallback;
  };

  // Helper function to build contact object
  const buildContact = (basics: NonNullable<typeof resumeFromDb.basics>): Contact => {
    const links: ContactLink[] = [];

    if (basics.linkedin) {
      links.push({
        label: "linkedin",
        url: basics.linkedin,
      });
    }

    if (basics.github) {
      links.push({
        label: "github",
        url: basics.github,
      });
    }

    for (const link of resumeFromDb.contactLinks ?? []) {
      links.push({
        label: link.label,
        url: link.url,
      });
    }

    return {
      email: normalizeString(basics.email),
      phone: normalizeString(basics.phone),
      location: normalizeString(basics.location),
      links,
    };
  };

  // Ensure basics exists
  if (!resumeFromDb.basics) {
    throw new Error("Resume basics are required");
  }

  // Build the DTO
  const dto: ResumePreviewDTO = {
    id: resumeFromDb.id,
    title: normalizeString(resumeFromDb.title, "Untitled Resume"),
    lastUpdated: resumeFromDb.updatedAt.toISOString(),
    basics: {
      fullName: resumeFromDb.basics.fullName,
      headline: normalizeString(resumeFromDb.basics.headline),
      summary: normalizeString(resumeFromDb.basics.summary),
      contact: buildContact(resumeFromDb.basics),
    },
    sections: {
      experience: resumeFromDb.experiences
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((exp) => ({
        id: exp.id,
        company: exp.company,
        role: exp.role,
        location: normalizeString(exp.location),
        duration: formatDateRange(exp.startDate, exp.endDate, exp.isCurrent),
        startDate: exp.startDate.toISOString(),
        endDate: exp.endDate ? exp.endDate.toISOString() : null,
        isCurrent: exp.isCurrent,
        bullets: exp.bullets || [],
        orderIndex: exp.orderIndex,
      })),
      education: resumeFromDb.educations
      .sort((a, b) => (b.endYear ?? 0) - (a.endYear ?? 0))
      .map((edu) => ({
        id: edu.id,
        institute: edu.institute,
        degree: edu.degree,
        field: normalizeString(edu.field),
        duration: formatYearRange(edu.startYear, edu.endYear),
        startYear: edu.startYear,
        endYear: edu.endYear,
      })),
      projects: resumeFromDb.projects.map((proj) => ({
        id: proj.id,
        name: proj.name,
        description: proj.description,
        techStack: proj.techStack || [],
        link: normalizeString(proj.link),
        dateLabel: normalizeString(proj.dateLabel),
      })),
      skills: resumeFromDb.skills.map((skill) => ({
        id: skill.id,
        name: skill.name,
        level: normalizeString(skill.level),
        category: normalizeString(skill.category),
      })),
      certifications: resumeFromDb.certifications.map((cert) => ({
        id: cert.id,
        name: cert.name,
        issuer: cert.issuer,
        year: cert.year,
        link: normalizeString(cert.link),
      })),
    },
    layoutSettings: resumeFromDb.layoutSettings
      ? {
          pageMode: normalizeString(resumeFromDb.layoutSettings.pageMode, "auto"),
          density: normalizeString(resumeFromDb.layoutSettings.density, "balanced"),
          fontSize: resumeFromDb.layoutSettings.fontSize,
          lineHeight: resumeFromDb.layoutSettings.lineHeight,
          pagePaddingTop: resumeFromDb.layoutSettings.pagePaddingTop,
          pagePaddingBottom: resumeFromDb.layoutSettings.pagePaddingBottom,
          pagePaddingX: resumeFromDb.layoutSettings.pagePaddingX,
          sectionSpacing: resumeFromDb.layoutSettings.sectionSpacing,
          itemSpacing: resumeFromDb.layoutSettings.itemSpacing,
          bulletSpacing: resumeFromDb.layoutSettings.bulletSpacing,
        }
      : null,
    sectionVisibility: resumeFromDb.layoutSettings
      ? {
          summary: resumeFromDb.layoutSettings.showSummary,
          experience: resumeFromDb.layoutSettings.showExperience,
          education: resumeFromDb.layoutSettings.showEducation,
          projects: resumeFromDb.layoutSettings.showProjects,
          skills: resumeFromDb.layoutSettings.showSkills,
          certifications: resumeFromDb.layoutSettings.showCertifications,
        }
      : {
          summary: true,
          experience: true,
          education: true,
          projects: true,
          skills: true,
          certifications: true,
        },
  };

  return dto;
}
