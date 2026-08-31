"use client";

import { useState, useMemo, useEffect } from "react";
import { Course, CourseWithSections, Section } from "@/lib/types";
import CourseSearch from "./CourseSearch";
import ScheduleCalendar from "./Calendar";

export default function Scheduler() {
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<CourseWithSections[]>(
    [],
  );
  const [expandedCourseIds, setExpandedCourseIds] = useState<Set<string>>(
    () => new Set(),
  );

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

  function addCourse(course: Course) {
    setSelectedCourses((previousCourses) => {
      const alreadySelected = previousCourses.some(
        (selected) => selected.course_id === course.course_id,
      );

      if (alreadySelected) {
        return previousCourses;
      }

      const courseWithSections: CourseWithSections = {
        ...course,
        sections: allSections.filter(
          (section) => section.course_id === course.course_id,
        ),
      };
      return [...previousCourses, courseWithSections];
    });
  }

  function removeSelectedCourse(course: Course) {
    setSelectedCourses((previousCourses) =>
      previousCourses.filter(
        (selectedCourse) => selectedCourse.course_id !== course.course_id,
      ),
    );
  }

  function toggleCourseDropdown(courseId: string) {
    setExpandedCourseIds((previousIds) => {
      const nextIds = new Set(previousIds);

      if (nextIds.has(courseId)) {
        nextIds.delete(courseId);
      } else {
        nextIds.add(courseId);
      }

      return nextIds;
    });
  }

  return (
    <main>
      <div className="flex gap-6">
        <CourseSearch
          className="max-h-[calc(100vh-12rem)] flex-1 overflow-y-auto pr-2"
          courses={courses}
          selectedCourses={selectedCourses}
          expandedCourseIds={expandedCourseIds}
          addCourse={addCourse}
          removeCourse={removeSelectedCourse}
          dropdownCourse={toggleCourseDropdown}
        />

        <ScheduleCalendar className="flex-2" selectedSections={[]} />
      </div>
    </main>
  );
}
