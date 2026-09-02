import { Meeting, Section } from "@/lib/types";

export function checkConflictingMeeting(a: Meeting, b: Meeting): boolean {
  if (!a.start_time || !a.end_time || !b.start_time || !b.end_time) {
    return false;
  }

  const sharesDay = a.days.some((day) => b.days.includes(day));
  if (!sharesDay) {
    return false;
  }

  return a.start_time < b.end_time && b.start_time < a.end_time;
}

export function sectionConflict(a: Section, b: Section): boolean {
  return a.meetings.some((aMeeting) =>
    b.meetings.some((bMeeting) => checkConflictingMeeting(aMeeting, bMeeting)),
  );
}
