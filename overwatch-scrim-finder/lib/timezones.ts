import * as ct from "countries-and-timezones";
import moment from "moment-timezone";

const TIME_VALUE_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

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
  if (!TIME_VALUE_PATTERN.test(normalizedTime)) {
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

export const formatTimeForDisplay = (
  timeHHmm: string,
  options?: {
    timeZone?: string;
    locale?: string | string[];
  },
) => {
  const normalizedTime = timeHHmm.trim();
  const match = normalizedTime.match(TIME_VALUE_PATTERN);
  if (!match) {
    return normalizedTime;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const timeZone = options?.timeZone?.trim();

  try {
    const date = new Date(Date.UTC(2000, 0, 1, hours, minutes));
    const formatter = new Intl.DateTimeFormat(options?.locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      ...(timeZone ? { timeZone } : {}),
    });

    return formatter.format(date);
  } catch {
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
  }
};