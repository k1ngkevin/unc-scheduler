"use client";

import { useState } from "react";
import CourseCard from "./CourseCard";
import { Course, Section } from "@/lib/types";

type CourseSearchProps = {
  className?: string;
  courses: Course[];
  onCourseSelect: (course: Course) => void;
};

export default function CourseSearch({
  className,
  courses,
  onCourseSelect,
}: CourseSearchProps) {
  const [query, setQuery] = useState("");
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);

  function filterCourse(query: string) {
    const normalizedQuery = query.trim().toUpperCase();
    if (!normalizedQuery) {
      setFilteredCourses([]);
      return;
    }

    const input = /^([A-Z]+)\s*((\d.*)?)$/.exec(normalizedQuery);

    if (!input) {
      setFilteredCourses([]);
      return;
    }

    const subject = input[1];
    const course_number = input[2];

    const results = courses.filter((course) => {
      if (course_number) {
        return (
          course["subject"] === subject &&
          course["course_number"].startsWith(course_number)
        );
      }
      return course["subject"] === subject;
    });
    setFilteredCourses(results);
  }

  return (
    <section className={className ?? ""}>
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
              filterCourse(e.target.value);
            }}
            placeholder="COMP or COMP 110"
            className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-zinc-400 focus:ring-2 focus:ring-white/10"
          />
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Enter a subject, with an optional course number.
        </p>
      </div>

      <div className="mt-6 grid gap-3">
        {filteredCourses.map((course) => (
          <CourseCard
            key={course.course_id}
            subject={course.subject}
            number={course.course_number}
            title={course.title}
            onClick={() => onCourseSelect(course)}
          />
        ))}
      </div>
    </section>
  );
}
