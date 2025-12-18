type SalaryResult = {
  min?: number;
  max?: number;
  period?: "MONTH" | "YEAR";
};

export const extractSalaryFromDescription = (
  text: string
): SalaryResult => {
  if (!text) return {};

  const normalized = text
    .toLowerCase()
    .replace(/\n/g, " ")
    .replace(/,/g, "");

  // Must contain salary keywords
  if (!/(salary|pay|stipend|ctc|compensation)/i.test(normalized)) {
    return {};
  }

  // RANGE
  const rangeRegex =
    /(₹|inr)?\s*(\d{4,})\s*(?:-|to)\s*(₹|inr)?\s*(\d{4,})\s*(per\s*)?(month|year|annum)?/i;

  const rangeMatch = normalized.match(rangeRegex);
  if (rangeMatch) {
    return {
      min: Number(rangeMatch[2]),
      max: Number(rangeMatch[4]),
      period: normalizePeriod(rangeMatch[6]),
    };
  }

  // SINGLE
  const singleRegex =
    /(₹|inr)?\s*(\d{4,})\s*(per\s*)?(month|year|annum)/i;

  const singleMatch = normalized.match(singleRegex);
  if (singleMatch) {
    const value = Number(singleMatch[2]);
    return {
      min: value,
      max: value,
      period: normalizePeriod(singleMatch[4]),
    };
  }

  return {};
};

const normalizePeriod = (
  value?: string
): "MONTH" | "YEAR" | undefined => {
  if (!value) return undefined;
  if (value.includes("month")) return "MONTH";
  return "YEAR";
};
