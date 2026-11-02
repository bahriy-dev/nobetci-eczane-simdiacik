/**
 * Turkish duty lists run from the morning handover (08:00–09:00) to the next morning, and sources
 * label them with the day they started. After midnight the previous day's list is still current.
 */
const handoverHour = 9;
const dayMs = 86_400_000;

export function turkeyDay(time: number | Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(time);
}

/** Duty-list dates that can be running now: yesterday's only until the morning handover. */
export function activeDutyDates(now: Date) {
  const today = turkeyDay(now);
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', hourCycle: 'h23' }).format(now));
  return hour < handoverHour ? [today, turkeyDay(now.getTime() - dayMs)] : [today];
}

/** A list dated `day` is replaced at the next morning's handover. */
export function dutyListEnds(day: string) {
  return new Date(`${day}T0${handoverHour}:00:00+03:00`).getTime() + dayMs;
}
