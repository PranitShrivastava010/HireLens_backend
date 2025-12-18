type LocationResult = {
  city?: string;
  state?: string;
  country?: string;
};

const INDIAN_STATES = [
  "andhra pradesh",
  "arunachal pradesh",
  "assam",
  "bihar",
  "chhattisgarh",
  "goa",
  "gujarat",
  "haryana",
  "himachal pradesh",
  "jharkhand",
  "karnataka",
  "kerala",
  "madhya pradesh",
  "maharashtra",
  "manipur",
  "meghalaya",
  "mizoram",
  "nagaland",
  "odisha",
  "punjab",
  "rajasthan",
  "sikkim",
  "tamil nadu",
  "telangana",
  "tripura",
  "uttar pradesh",
  "uttarakhand",
  "west bengal",
  "delhi",
  "puducherry",
  "chandigarh"
];

const COMMON_CITIES = [
  "hyderabad",
  "bangalore",
  "bengaluru",
  "chennai",
  "mumbai",
  "pune",
  "delhi",
  "noida",
  "gurgaon",
  "gurugram",
  "kolkata",
  "ahmedabad",
  "jaipur",
  "indore",
  "bhopal",
  "nagpur",
  "kochi",
  "trivandrum",
  "coimbatore",
  "madurai",
  "vijayawada",
  "vizag",
  "visakhapatnam"
];

export const extractLocationFromDescription = (
  text: string
): LocationResult => {
  if (!text) return {};

  const normalized = text
    .replace(/\n/g, " ")
    .replace(/\u00A0/g, " ")
    .toLowerCase();

  let city: string | undefined;
  let state: string | undefined;
  let country: string | undefined;

  // 🇮🇳 Country detection (safe)
  if (/\bindia\b/.test(normalized)) {
    country = "India";
  }

  // 🏙 City detection
  for (const c of COMMON_CITIES) {
    const regex = new RegExp(`\\b${c}\\b`, "i");
    if (regex.test(normalized)) {
      city = capitalize(c);
      break;
    }
  }

  // 🗺 State detection
  for (const s of INDIAN_STATES) {
    const regex = new RegExp(`\\b${s}\\b`, "i");
    if (regex.test(normalized)) {
      state = capitalize(s);
      break;
    }
  }

  return {
    city,
    state,
    country
  };
};

const capitalize = (value: string) =>
  value
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
