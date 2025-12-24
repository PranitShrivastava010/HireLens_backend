import pdfParse from "pdf-parse";

export const extractPdfText = async (fileBuffer: Buffer): Promise<string> => {
  const data = await pdfParse(fileBuffer);
  return data.text.replace(/\s+/g, " ").trim();
};
