import type { Course, CourseWithSections, Section } from "@/lib/types";

type CourseIdentity = Pick<Course, "term" | "course_id" | "subject">;

export function courseKey(course: CourseIdentity): string {
  return `${course.term}:${course.course_id}`;
}

export function courseListingKey(course: CourseIdentity): string {
  return `${courseKey(course)}:${course.subject}`;
}

export function sectionsForCourse(
  course: CourseIdentity,
  sections: Section[],
): Section[] {
  return sections.filter(
    (section) => courseListingKey(section) === courseListingKey(course),
  );
}

export function restoreCourseListings(
  courses: CourseWithSections[],
  sections: Section[],
): { courses: CourseWithSections[]; sections: Section[] } {
  const restoredCourses = courses.map((course) => ({
    ...course,
    sections: sectionsForCourse(course, course.sections),
  }));
  const listingKeys = new Set(restoredCourses.map(courseListingKey));
  return {
    courses: restoredCourses,
    sections: sections.filter((section) =>
      listingKeys.has(courseListingKey(section)),
    ),
  };
}
