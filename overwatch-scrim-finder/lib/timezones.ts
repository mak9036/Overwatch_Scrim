import * as ct from "countries-and-timezones";
import moment from "moment-timezone";

export const resolveTimeZoneFromCountryCode = (countryCode: string) => {
  const normalizedCode = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalizedCode)) {
    return "";
  }

  const country = ct.getCountry(normalizedCode);
  if (!country || !Array.isArray(country.timezones) || country.timezones.length === 0) {
    return "";
  }

  return country.timezones[0] || "";
};

export const getTimeZoneAbbreviation = (timeZone: string, atDate: Date = new Date()) => {
  const normalizedZone = timeZone.trim();
  if (!normalizedZone) {
    return "UTC";
  }

  try {
    if (!moment.tz.zone(normalizedZone)) {
      return normalizedZone;
    }

    const abbreviation = moment.tz(atDate, normalizedZone).format("z").trim();
    if (!abbreviation) {
      return normalizedZone;
    }

    return abbreviation;
  } catch {
    return normalizedZone;
  }
};

export const convertTimeBetweenTimeZones = (
  timeHHmm: string,
  fromTimeZone: string,
  toTimeZone: string,
) => {
  const normalizedTime = timeHHmm.trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(normalizedTime)) {
    return normalizedTime;
  }

  const sourceZone = fromTimeZone.trim() || "UTC";
  const targetZone = toTimeZone.trim() || "UTC";

  try {
    if (!moment.tz.zone(sourceZone) || !moment.tz.zone(targetZone)) {
      return normalizedTime;
    }

    return moment
      .tz(`2000-01-01 ${normalizedTime}`, "YYYY-MM-DD HH:mm", sourceZone)
      .tz(targetZone)
      .format("HH:mm");
  } catch {
    return normalizedTime;
  }
};