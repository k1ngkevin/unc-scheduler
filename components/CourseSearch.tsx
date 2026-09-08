"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import CourseCard from "./CourseCard";
import CourseSections from "./CourseSections";
import { Course, CourseWithSections, Section } from "@/lib/types";

type CourseSearchProps = {
  className?: string;
  courses: Course[];
  selectedCourses: CourseWithSections[];
  selectedSections: Section[];
  expandedCourseIds: Set<string>;
  addCourse: (course: Course) => void;
  removeCourse: (course: Course) => void;
  selectSection: (section: Section) => void;
  removeSection: (section: Section) => void;
  dropdownCourse: (courseId: string) => void;
};

export default function CourseSearch({
  className,
  courses,
  selectedCourses,
  selectedSections,
  expandedCourseIds,
  addCourse,
  removeCourse,
  selectSection,
  removeSection,
  dropdownCourse,
}: CourseSearchProps) {
  const [query, setQuery] = useState("");

  const filteredCourses = useMemo<Course[]>(() => {
    const normalizedQuery = query.trim().toUpperCase();
    if (!normalizedQuery) {
      return [];
    }

    const input = /^([A-Z]+)\s*((\d.*)?)$/.exec(normalizedQuery);
    if (!input) {
      return [];
    }

    const subject = input[1];
    const courseNumber = input[2];

    const selectedIds = new Set(
      selectedCourses.map((course) => course.course_id),
    );

    return courses.filter((course) => {
      if (selectedIds.has(course.course_id)) {
        return false;
      }

      if (course.subject !== subject) {
        return false;
      }

      return !courseNumber || course.course_number.startsWith(courseNumber);
    });
  }, [courses, query, selectedCourses]);

  return (
    <section className={className ?? ""}>
      <div>
        <label
          htmlFor="course-search"
          className="mb-2 block text-xs font-semibold text-ink"
        >
          Find a course
        </label>
        <div className="relative">
          <MagnifyingGlassIcon
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
          <input
            id="course-search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            placeholder="COMP or COMP 110"
            autoComplete="off"
            aria-describedby="course-search-help"
            className="w-full min-w-0 rounded-sm border border-line bg-surface py-2.5 pl-9 pr-3 text-xs text-ink outline-none transition-colors placeholder:text-muted focus:border-carolina focus:ring-2 focus:ring-carolina/20"
          />
        </div>
        <p id="course-search-help" className="mt-2 text-[11px] leading-relaxed text-muted">
          Enter a subject, with an optional course number.
        </p>
      </div>

      {query.trim() && (
        <div className="mt-3 max-h-72 overflow-y-auto">
          <div className="grid gap-2">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.course_id}
                subject={course.subject}
                number={course.course_number}
                title={course.title}
                variant="notSelected"
                onClick={() => addCourse(course)}
              />
            ))}
          </div>
          {filteredCourses.length === 0 && (
            <p className="py-2 text-xs text-muted">No matching courses to add.</p>
          )}
        </div>
      )}

      <div className="mb-3 mt-6 flex items-center justify-between border-t border-line pt-4">
        <h2 className="text-xs font-semibold text-ink">Your courses</h2>
        <span className="text-xs tabular-nums text-muted">{selectedCourses.length}</span>
      </div>
      <div className="grid gap-2">
        {selectedCourses.map((course) => (
          <div key={course.course_id}>
            <CourseCard
              subject={course.subject}
              number={course.course_number}
              title={course.title}
              variant="selected"
              expanded={expandedCourseIds.has(course.course_id)}
              removeCourse={() => removeCourse(course)}
              onClick={() => dropdownCourse(course.course_id)}
            />
            {expandedCourseIds.has(course.course_id) && (
              <CourseSections
                sections={course.sections}
                selectedSections={selectedSections}
                selectSection={selectSection}
                removeSection={removeSection}
              />
            )}
          </div>
        ))}
      </div>
      {selectedCourses.length === 0 && (
        <p className="text-xs leading-relaxed text-muted">
          Add a course, then choose a section to build your week.
        </p>
      )}
    </section>
  );
}
