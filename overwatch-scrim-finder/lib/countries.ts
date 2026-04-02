import countriesJson from "country-list/data.json";

interface CountryEntry {
  code: string;
  name: string;
}

const normalizeCountryLabel = (value: string) =>
  value
    .replace(/\s*\((?:the|The)\)\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();

const allCountries = (countriesJson as CountryEntry[])
  .filter((country) => /^[A-Z]{2}$/.test(country.code))
  .map((country) => ({
    value: country.code,
    label: normalizeCountryLabel(country.name),
  }))
  .sort((leftCountry, rightCountry) => leftCountry.label.localeCompare(rightCountry.label));

export const COUNTRY_OPTIONS = allCountries;

export const getCountryLabel = (countryCode: string) => {
  const normalizedCode = countryCode.trim().toUpperCase();
  const found = COUNTRY_OPTIONS.find((country) => country.value === normalizedCode);
  return found?.label || normalizedCode || "Not set";
};