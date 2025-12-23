import fs from "fs";
import pdfParse from "pdf-parse";

export const extractPdfText = async (filePath: string): Promise<string> => {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text.replace(/\s+/g, " ").trim();
};

