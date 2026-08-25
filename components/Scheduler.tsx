"use client";

import { useState, useMemo, useEffect } from "react";
import { Course, CourseWithSections, Section } from "@/lib/types";
import CourseSearch from "./CourseSearch";
import ScheduleCalendar from "./Calendar";

export default function Scheduler() {
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [selectedCourse, setSelectedCourse] =
    useState<CourseWithSections | null>(null);

  useEffect(() => {
    async function fetchCourseData() {
      const file_name = "2269.json";
      const supabase_id = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
      const api_url = `https://${supabase_id}.supabase.co/storage/v1/object/public/course-data/scraped_data/${file_name}`;
      try {
        const response = await fetch(api_url);

        if (!response.ok) {
          throw new Error(`response status: ${response.status}`);
        }

        const result: Section[] = await response.json();

        setAllSections(result);
      } catch (error) {
        console.error(error);
      }
    }
    fetchCourseData();
  }, []);

  const courses = useMemo<Course[]>(() => {
    const uniqueCourses = new Map<string, Course>();

    for (const section of allSections) {
      if (!uniqueCourses.has(section.course_id)) {
        uniqueCourses.set(section.course_id, {
          course_id: section.course_id,
          term: section.term,
          subject: section.subject,
          course_number: section.course_number,
          title: section.title,
        });
      }
    }

    return Array.from(uniqueCourses.values());
  }, [allSections]);

  function onCourseClick(course: Course) {
    setSelectedCourse({
      ...course,
      sections: allSections.filter(
        (section) => section.course_id === course.course_id,
      ),
    });
  }
  return (
    <main>
      <div className="flex gap-6">
        <div className="flex-1">
          <CourseSearch courses={courses} onCourseSelect={onCourseClick} />

          {selectedCourse && (
            <div className="mt-6 grid gap-3">
              <h2 className="text-xl font-semibold text-white">
                {selectedCourse.subject} {selectedCourse.course_number} sections
              </h2>

              {selectedCourse.sections.map((section) => (
                <button
                  type="button"
                  key={section.class_number}
                  className="rounded-xl bg-zinc-800 p-4 text-left"
                >
                  <p className="font-semibold text-white">
                    Section {section.section}
                  </p>

                  <p className="text-sm text-zinc-400">
                    {section.available_seats} seats available
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <ScheduleCalendar className="flex-2" selectedSections={[]} />
      </div>
    </main>
  );
}
