import { courseListingKey, sectionsForCourse } from "./courseIdentity";
import type {
  Course,
  CourseWithSections,
  SavedSchedule,
  Section,
} from "./types";

export type ScheduleSelection = Pick<
  SavedSchedule,
  "term" | "selectedCourses" | "selectedClassNumbers"
>;

export type ScheduleDraft = ScheduleSelection & {
  expandedCourseIds: string[];
  activeScheduleId: string | null;
};

export const SAVED_SCHEDULES_KEY = "savedSchedules";
export const DRAFT_SCHEDULE_KEY = "schedule";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCourse(value: unknown): value is Course {
  return (
    isRecord(value) &&
    ["course_id", "term", "subject", "course_number", "title"].every(
      (key) => typeof value[key] === "string",
    )
  );
}

function isSelection(value: unknown): value is ScheduleSelection {
  return (
    isRecord(value) &&
    typeof value.term === "string" &&
    value.term.length > 0 &&
    Array.isArray(value.selectedCourses) &&
    value.selectedCourses.every(
      (course) => isCourse(course) && course.term === value.term,
    ) &&
    Array.isArray(value.selectedClassNumbers) &&
    value.selectedClassNumbers.every((id) => Number.isInteger(id) && id > 0)
  );
}

function courseDetails(course: Course): Course {
  // Copy only course metadata, never the catalog of alternative sections.
  const { course_id, term, subject, course_number, title } = course;
  return { course_id, term, subject, course_number, title };
}

export function createScheduleSelection(
  term: string,
  courses: Course[],
  sections: Section[],
): ScheduleSelection {
  const selectedCourses = courses
    .filter((course) => course.term === term)
    .map(courseDetails);
  const listingKeys = new Set(selectedCourses.map(courseListingKey));
  return {
    term,
    selectedCourses,
    selectedClassNumbers: Array.from(
      new Set(
        sections
          .filter((section) => listingKeys.has(courseListingKey(section)))
          .map((section) => section.class_number),
      ),
    ),
  };
}

export function parseSavedSchedules(raw: string | null): SavedSchedule[] {
  if (!raw) return [];
  const data: unknown = JSON.parse(raw);
  if (
    !Array.isArray(data) ||
    !data.every(
      (item): item is SavedSchedule =>
        isRecord(item) &&
        typeof item.id === "string" &&
        item.id.length > 0 &&
        typeof item.name === "string" &&
        item.name.trim().length > 0 &&
        isSelection(item),
    ) ||
    new Set(data.map((item) => item.id)).size !== data.length
  ) {
    throw new Error("Invalid saved schedules");
  }
  return data;
}

export function parseScheduleDraft(
  raw: string | null,
  defaultTerm: string,
): ScheduleDraft {
  if (!raw)
    return {
      term: defaultTerm,
      selectedCourses: [],
      selectedClassNumbers: [],
      expandedCourseIds: [],
      activeScheduleId: null,
    };
  const data: unknown = JSON.parse(raw);
  if (!isRecord(data)) throw new Error("Invalid schedule draft");
  const { expandedCourseIds, activeScheduleId } = data;

  let selection: ScheduleSelection;
  if (isSelection(data)) {
    selection = data;
  } else {
    // Migrate the original full-object draft without retaining stale sections.
    if (
      !Array.isArray(data.selectedCourses) ||
      !data.selectedCourses.every(isCourse) ||
      !Array.isArray(data.selectedSections)
    )
      throw new Error("Invalid schedule draft");
    const term =
      typeof data.selectedTerm === "string"
        ? data.selectedTerm
        : (data.selectedCourses[0]?.term ?? defaultTerm);
    const courses = data.selectedCourses
      .filter((course) => course.term === term)
      .map(courseDetails);
    const listingKeys = new Set(courses.map(courseListingKey));
    selection = {
      term,
      selectedCourses: courses,
      selectedClassNumbers: Array.from(
        new Set(
          data.selectedSections
            .filter(
              (section) =>
                isRecord(section) &&
                Number.isInteger(section.class_number) &&
                isCourse(section) &&
                listingKeys.has(courseListingKey(section)),
            )
            .map((section) => section.class_number as number),
        ),
      ),
    };
  }
  const expandedIds: unknown[] = Array.isArray(expandedCourseIds)
    ? expandedCourseIds
    : [];
  return {
    term: selection.term,
    selectedCourses: selection.selectedCourses.map(courseDetails),
    selectedClassNumbers: selection.selectedClassNumbers,
    expandedCourseIds: selection.selectedCourses
      .filter(
        (course) =>
          expandedIds.includes(courseListingKey(course)) ||
          expandedIds.includes(course.course_id),
      )
      .map(courseListingKey),
    activeScheduleId:
      typeof activeScheduleId === "string" ? activeScheduleId : null,
  };
}

export function restoreSchedule(
  selection: ScheduleSelection,
  catalog: Section[],
) {
  const termSections = catalog.filter(
    (section) => section.term === selection.term,
  );
  const courses: CourseWithSections[] = selection.selectedCourses.map(
    (course) => {
      const sections = sectionsForCourse(course, termSections);
      return { ...courseDetails(sections[0] ?? course), sections };
    },
  );
  const sectionsByNumber = new Map(
    courses
      .flatMap((course) => course.sections)
      .map((section) => [section.class_number, section]),
  );
  const sections: Section[] = [];
  const missingClassNumbers: number[] = [];
  for (const id of new Set(selection.selectedClassNumbers)) {
    const section = sectionsByNumber.get(id);
    if (section) sections.push(section);
    else missingClassNumbers.push(id);
  }
  return {
    courses,
    sections,
    missingClassNumbers,
    missingCourses: courses.filter((course) => course.sections.length === 0),
  };
}

export function schedulesMatch(
  a: ScheduleSelection,
  b: ScheduleSelection,
): boolean {
  return (
    a.term === b.term &&
    JSON.stringify(a.selectedCourses.map(courseListingKey).sort()) ===
      JSON.stringify(b.selectedCourses.map(courseListingKey).sort()) &&
    JSON.stringify([...a.selectedClassNumbers].sort((x, y) => x - y)) ===
      JSON.stringify([...b.selectedClassNumbers].sort((x, y) => x - y))
  );
}
