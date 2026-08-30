"use client";

import { useMemo, useState } from "react";
import CourseCard from "./CourseCard";
import { Course, CourseWithSections } from "@/lib/types";

type CourseSearchProps = {
  className?: string;
  courses: Course[];
  selectedCourses: CourseWithSections[];
  expandedCourseIds: Set<string>;
  addCourse: (course: Course) => void;
  dropdownCourse: (courseId: string) => void;
};

export default function CourseSearch({
  className,
  courses,
  selectedCourses,
  expandedCourseIds,
  addCourse,
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
      <div className="mt-3 mb-3 grid gap-3">
        {selectedCourses.map((course) => (
          <div key={course.course_id}>
            <CourseCard
              subject={course.subject}
              number={course.course_number}
              title={course.title}
              variant={"selected"}
              onClick={() => dropdownCourse(course.course_id)}
            />

            {selectedCourses.map(
              (selectedCourse) =>
                selectedCourse.course_id === course.course_id &&
                expandedCourseIds.has(selectedCourse.course_id) && (
                  <div className="mt-2 grid gap-2 pl-4" key={course.course_id}>
                    {selectedCourse.sections.map((section) => (
                      <button
                        type="button"
                        key={section.class_number}
                        className="rounded-lg border border-white/10 bg-zinc-900 p-3 text-left"
                      >
                        <p className="font-medium text-white">
                          Section {section.section}
                        </p>

                        <p className="text-sm text-zinc-400">
                          {section.available_seats} seats available
                        </p>
                      </button>
                    ))}
                  </div>
                ),
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4 shadow-xl shadow-black/20 sm:p-5">
        <label
          htmlFor="course-search"
          className="mb-2 block text-sm font-medium text-zinc-200"
        >
          Search for a course
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="course-search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            placeholder="COMP or COMP 110"
            className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-zinc-400 focus:ring-2 focus:ring-white/10"
          />
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Enter a subject, with an optional course number.
        </p>
      </div>

      <div className="mt-3 grid gap-3">
        {filteredCourses.map((course) => (
          <div key={course.course_id}>
            <CourseCard
              subject={course.subject}
              number={course.course_number}
              title={course.title}
              variant={"notSelected"}
              onClick={() => addCourse(course)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
