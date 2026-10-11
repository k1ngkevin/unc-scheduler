import { parseSavedSchedules } from "./savedSchedules";
import type { SavedSchedule } from "./types";

export type SharedSchedule = Omit<SavedSchedule, "id">;

const MAX_TOKEN_LENGTH = 32768;

function validate(schedule: SharedSchedule): SharedSchedule {
  const [checked] = parseSavedSchedules(
    JSON.stringify([{ ...schedule, id: "shared" }]),
  );
  if (
    !/^\d{4}$/.test(checked.term) ||
    checked.name.length > 512 ||
    checked.selectedCourses.length > 100 ||
    checked.selectedClassNumbers.length > 300 ||
    checked.selectedCourses.some((course) =>
      Object.values(course).some((value) => !value || value.length > 512),
    ) ||
    checked.selectedClassNumbers.some((id) => !Number.isSafeInteger(id))
  ) {
    throw new Error("Invalid shared schedule");
  }
  const { name, term, selectedCourses, selectedClassNumbers } = checked;
  return { name, term, selectedCourses, selectedClassNumbers };
}

export function encodeSharedSchedule(schedule: SharedSchedule): string {
  const checked = validate(schedule);
  // Compact, versioned tuples keep links small and retain cross-listed identity.
  const payload = [
    1,
    checked.name,
    checked.term,
    checked.selectedCourses.map((course) => [
      course.course_id,
      course.subject,
      course.course_number,
      course.title,
    ]),
    checked.selectedClassNumbers,
  ];
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const token = btoa(
    Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
  if (token.length > MAX_TOKEN_LENGTH) {
    throw new Error("This schedule is too large to share in a link.");
  }
  return token;
}

export function decodeSharedSchedule(token: string): SharedSchedule {
  if (!token || token.length > MAX_TOKEN_LENGTH || !/^[\w-]+$/.test(token)) {
    throw new Error("Invalid shared schedule");
  }
  const bytes = Uint8Array.from(
    atob(token.replaceAll("-", "+").replaceAll("_", "/")),
    (character) => character.charCodeAt(0),
  );
  const payload: unknown = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(bytes),
  );
  if (!Array.isArray(payload) || payload.length !== 5 || payload[0] !== 1) {
    throw new Error("Unsupported shared schedule");
  }
  const [, name, term, courses, selectedClassNumbers] = payload;
  if (!Array.isArray(courses)) throw new Error("Invalid shared courses");
  const selectedCourses = courses.map((course: unknown) => {
    if (!Array.isArray(course) || course.length !== 4) {
      throw new Error("Invalid shared course");
    }
    const [course_id, subject, course_number, title] = course;
    return { course_id, subject, course_number, title, term };
  });
  return validate({ name, term, selectedCourses, selectedClassNumbers });
}

export function createShareUrl(
  schedule: SharedSchedule,
  currentUrl: string,
): string {
  const url = new URL(currentUrl);
  url.search = "";
  // The fragment stays in the browser rather than being sent to the app server.
  url.hash = `share=${encodeSharedSchedule(schedule)}`;
  return url.href;
}

export function sharedCopyName(
  name: string,
  schedules: SavedSchedule[],
): string {
  const names = new Set(
    schedules.map((schedule) => schedule.name.toLowerCase()),
  );
  if (!names.has(name.toLowerCase())) return name;
  let copy = `${name} (copy)`;
  for (let index = 2; names.has(copy.toLowerCase()); index++) {
    copy = `${name} (copy ${index})`;
  }
  return copy;
}
