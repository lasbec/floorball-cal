const DEFAULT_EVENT_DURATION_MINUTES = 90;

export function parseGermanDateTime(rawValue: string): Date {
  const normalized = rawValue.replace(/\s+/g, ' ').trim();
  const pattern = /(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})/;
  const match = normalized.match(pattern);

  if (match === null) {
    throw new Error(`Could not parse date value: ${rawValue}`);
  }

  const [, day, month, year, hours, minutes] = match;
  const dayValue = Number.parseInt(day, 10);
  const monthValue = Number.parseInt(month, 10) - 1;
  const yearValue = Number.parseInt(year, 10);
  const hourValue = Number.parseInt(hours, 10);
  const minuteValue = Number.parseInt(minutes, 10);

  return new Date(yearValue, monthValue, dayValue, hourValue, minuteValue);
}

export function calculateDefaultEnd(start: Date, durationMinutes = DEFAULT_EVENT_DURATION_MINUTES): Date {
  return new Date(start.getTime() + durationMinutes * 60 * 1000);
}
