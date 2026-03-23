import { isValid, parseISO, setHours, setMinutes, setSeconds } from 'date-fns';

export const DEFAULT_APPOINTMENT_TIME = '09:00';

type TimeParts = {
  hours: number;
  minutes: number;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const parseTimeWithMeridiem = (raw: string): TimeParts | null => {
  const match = raw.match(/^(\d{1,2}):(\d{2})(?:\s*)(AM|PM)$/i);
  if (!match) return null;

  const hour12 = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();

  if (!Number.isFinite(hour12) || !Number.isFinite(minutes)) return null;
  if (hour12 < 1 || hour12 > 12) return null;
  if (minutes < 0 || minutes > 59) return null;

  const hours = meridiem === 'PM' ? (hour12 % 12) + 12 : hour12 % 12;
  return { hours, minutes };
};

const parseTime24Hour = (raw: string): TimeParts | null => {
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (minutes < 0 || minutes > 59) return null;

  return { hours: clamp(hours, 0, 23), minutes };
};

export const parseAppointmentTime = (timeValue?: string | null): TimeParts | null => {
  const raw = `${timeValue ?? ''}`.trim();
  if (!raw) return null;

  return parseTime24Hour(raw) ?? parseTimeWithMeridiem(raw);
};

export const normalizeAppointmentTimeForInput = (
  timeValue?: string | null,
  fallback = DEFAULT_APPOINTMENT_TIME
): string => {
  const parsed = parseAppointmentTime(timeValue) ?? parseAppointmentTime(fallback);
  if (!parsed) return DEFAULT_APPOINTMENT_TIME;
  return `${parsed.hours.toString().padStart(2, '0')}:${parsed.minutes
    .toString()
    .padStart(2, '0')}`;
};

export const buildAppointmentDateTime = (
  dateValue: string,
  timeValue?: string | null,
  fallbackTime = DEFAULT_APPOINTMENT_TIME
): Date | null => {
  const baseDate = parseISO(dateValue);
  if (!isValid(baseDate)) return null;

  const parsedTime =
    parseAppointmentTime(timeValue) ?? parseAppointmentTime(fallbackTime);
  if (!parsedTime) return null;

  return setSeconds(
    setMinutes(setHours(baseDate, parsedTime.hours), parsedTime.minutes),
    0
  );
};
