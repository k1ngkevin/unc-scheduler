import type { CourseWithSections, Section } from "./types";
import { courseKey, sectionsForCourse } from "./courseIdentity";
import { sectionConflict } from "./schedule";
import { timeToMinutes } from "./time";

export type ScheduleSort = "earliest-end" | "latest-start" | "most-compact";

export type ScheduleMetrics = {
  earliestStart: number | null;
  latestEnd: number | null;
  gapMinutes: number;
  daysWithClasses: number;
  untimedSections: number;
};

export type RankedSchedule = {
  sections: Section[];
  metrics: ScheduleMetrics;
};

export type GenerationResult = {
  schedules: Section[][];
  limited: boolean;
};

type GenerationOptions = {
  signal?: AbortSignal;
  maxSchedules?: number;
  maxAttempts?: number;
};

export async function generateSchedules(
  courses: CourseWithSections[],
  { signal, maxSchedules = 500, maxAttempts = 100_000 }: GenerationOptions = {},
): Promise<GenerationResult> {
  if (
    !Number.isSafeInteger(maxSchedules) ||
    maxSchedules < 1 ||
    !Number.isSafeInteger(maxAttempts) ||
    maxAttempts < 1
  ) {
    throw new RangeError("Search limits must be positive integers");
  }
  const possibleSchedules: Section[][] = [];
  const groups: Section[][] = [];
  const seenCourses = new Set<string>();
  for (const course of courses) {
    if (seenCourses.has(courseKey(course))) continue;
    seenCourses.add(courseKey(course));
    const components = new Map<string | null, Section[]>();
    for (const section of sectionsForCourse(course, course.sections)) {
      const sections = components.get(section.component) ?? [];
      if (
        !sections.some((item) => item.class_number === section.class_number)
      ) {
        sections.push(section);
      }
      components.set(section.component, sections);
    }
    if (components.size === 0) return { schedules: [], limited: false };
    groups.push(...components.values());
  }

  const sortedGroups = groups.toSorted((a, b) => a.length - b.length);
  let attempts = 0;
  let limited = false;

  async function search(groupIndex: number, chosenSections: Section[]) {
    signal?.throwIfAborted();
    if (groupIndex === sortedGroups.length) {
      // Look for one extra result so an exactly-full result is not called partial.
      if (possibleSchedules.length === maxSchedules) {
        limited = true;
        return;
      }
      possibleSchedules.push([...chosenSections]);
      return;
    }

    for (const candidate of sortedGroups[groupIndex]) {
      if (limited) return;
      if (attempts === maxAttempts) {
        limited = true;
        return;
      }
      attempts++;
      // Give the browser time to paint and handle closing/canceling the search.
      if (attempts % 250 === 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        signal?.throwIfAborted();
      }
      if (
        chosenSections.some((section) => sectionConflict(candidate, section))
      ) {
        continue;
      }

      chosenSections.push(candidate);
      await search(groupIndex + 1, chosenSections);
      chosenSections.pop();
    }
  }
  await search(0, []);
  return { schedules: possibleSchedules, limited };
}

const days = new Set(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]);
const validTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function scheduleMetrics(sections: Section[]): ScheduleMetrics {
  const byDay = new Map<string, { start: number; end: number }[]>();
  let earliestStart: number | null = null;
  let latestEnd: number | null = null;
  let untimedSections = 0;

  for (const section of sections) {
    let hasUnknownTime = section.meetings.length === 0;
    for (const meeting of section.meetings) {
      if (
        !meeting.start_time ||
        !validTime.test(meeting.start_time) ||
        !meeting.end_time ||
        !validTime.test(meeting.end_time) ||
        meeting.days.length === 0 ||
        meeting.days.some((day) => !days.has(day))
      ) {
        hasUnknownTime = true;
        continue;
      }
      const start = timeToMinutes(meeting.start_time);
      const end = timeToMinutes(meeting.end_time);
      if (end <= start) {
        hasUnknownTime = true;
        continue;
      }
      earliestStart = Math.min(earliestStart ?? start, start);
      latestEnd = Math.max(latestEnd ?? end, end);
      for (const day of new Set(meeting.days)) {
        const intervals = byDay.get(day) ?? [];
        intervals.push({ start, end });
        byDay.set(day, intervals);
      }
    }
    if (hasUnknownTime) untimedSections++;
  }

  let gapMinutes = 0;
  for (const intervals of byDay.values()) {
    intervals.sort((a, b) => a.start - b.start || a.end - b.end);
    let previousEnd = intervals[0].end;
    for (const { start, end } of intervals.slice(1)) {
      gapMinutes += Math.max(0, start - previousEnd);
      previousEnd = Math.max(previousEnd, end);
    }
  }
  return {
    earliestStart,
    latestEnd,
    gapMinutes,
    daysWithClasses: byDay.size,
    untimedSections,
  };
}

export function sortSchedules(
  schedules: RankedSchedule[],
  sort: ScheduleSort,
): RankedSchedule[] {
  return schedules.toSorted((a, b) => {
    // Unknown times must not win by looking like zero gaps or no early classes.
    const unknown =
      Number(a.metrics.untimedSections > 0) -
      Number(b.metrics.untimedSections > 0);
    if (unknown) return unknown;
    if (sort === "earliest-end") {
      return (
        (a.metrics.latestEnd ?? Infinity) - (b.metrics.latestEnd ?? Infinity)
      );
    }
    if (sort === "latest-start") {
      return (
        (b.metrics.earliestStart ?? -Infinity) -
        (a.metrics.earliestStart ?? -Infinity)
      );
    }
    return (
      (a.metrics.daysWithClasses ? a.metrics.gapMinutes : Infinity) -
      (b.metrics.daysWithClasses ? b.metrics.gapMinutes : Infinity)
    );
  });
}
