const dayFormatterCache = new Map<string, Intl.DateTimeFormat>();
const hourFormatterCache = new Map<string, Intl.DateTimeFormat>();
const weekdayFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getDayFormatter(timeZone: string) {
  const cached = dayFormatterCache.get(timeZone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  dayFormatterCache.set(timeZone, formatter);
  return formatter;
}

function getHourFormatter(timeZone: string) {
  const cached = hourFormatterCache.get(timeZone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    hour12: false
  });
  hourFormatterCache.set(timeZone, formatter);
  return formatter;
}

function getWeekdayFormatter(timeZone: string) {
  const cached = weekdayFormatterCache.get(timeZone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short"
  });
  weekdayFormatterCache.set(timeZone, formatter);
  return formatter;
}

export function normalizeTimeZone(value: string | null | undefined) {
  const fallback = "UTC";
  if (!value || typeof value !== "string") return fallback;

  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return value;
  } catch {
    return fallback;
  }
}

export function dayKeyInTimeZone(date: Date, timeZone: string) {
  const formatter = getDayFormatter(normalizeTimeZone(timeZone));
  const parts = formatter.formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

export function relativeDayKeyInTimeZone(date: Date, offsetDays: number, timeZone: string) {
  const shifted = new Date(date.getTime());
  shifted.setUTCDate(shifted.getUTCDate() + offsetDays);
  return dayKeyInTimeZone(shifted, timeZone);
}

export function hourInTimeZone(date: Date, timeZone: string) {
  const formatter = getHourFormatter(normalizeTimeZone(timeZone));
  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  return Number.isFinite(hour) ? hour : 0;
}

export function weekdayInTimeZone(date: Date, timeZone: string) {
  const formatter = getWeekdayFormatter(normalizeTimeZone(timeZone));
  const weekday = formatter.format(date);

  switch (weekday) {
    case "Mon":
      return 1;
    case "Tue":
      return 2;
    case "Wed":
      return 3;
    case "Thu":
      return 4;
    case "Fri":
      return 5;
    case "Sat":
      return 6;
    default:
      return 0;
  }
}
