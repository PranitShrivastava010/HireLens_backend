export const safeParseJSON = (text: string) => {
  // Remove markdown code blocks if present
  const cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("❌ AI RAW RESPONSE:", text);
    throw new Error("AI returned invalid JSON");
  }
};
