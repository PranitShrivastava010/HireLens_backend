export const extractQualifications = (text: string): string[] => {
  if (!text) return [];

  const results: string[] = [];

  const sectionRegex =
    /(educational qualification|qualification|required qualifications|education)[^:\n]*[:\-]([\s\S]*?)(\n\n|$)/i;

  const match = text.match(sectionRegex);
  if (!match) return [];

  const section = match[2];

  section
    .split(/\n|•|- /)
    .map(l => l.trim())
    .filter(Boolean)
    .forEach(line => {
      if (line.length > 4) results.push(line);
    });

  return [...new Set(results)];
};
