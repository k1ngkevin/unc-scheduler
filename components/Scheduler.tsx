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
  const [selectedSections, setSelectedSections] = useState<Section[]>([]);
  const [expandedCourseIds, setExpandedCourseIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [storageLoaded, setStorageLoaded] = useState<boolean>(false);

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem("schedule");

      if (saved) {
        const data = JSON.parse(saved);

        if (Array.isArray(data?.selectedCourses)) {
          setSelectedCourses(data.selectedCourses);
        }

        if (Array.isArray(data?.selectedSections)) {
          setSelectedSections(data.selectedSections);
        }

        if (Array.isArray(data?.expandedCourseIds)) {
          setExpandedCourseIds(new Set(data.expandedCourseIds));
        }
      }
    } catch (error) {
      console.error("failed to load schedule from localStorage");
    } finally {
      setStorageLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }

    try {
      localStorage.setItem(
        "schedule",
        JSON.stringify({
          selectedCourses,
          selectedSections,
          expandedCourseIds,
        }),
      );
    } catch {
      console.error("failed to save to localStorage");
    }
  }, [selectedCourses, selectedSections, expandedCourseIds, storageLoaded]);

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

  function selectSection(section: Section) {
    setSelectedSections((previousSections) => [
      ...previousSections.filter(
        (selected) =>
          selected.course_id !== section.course_id ||
          selected.component !== section.component,
      ),
      section,
    ]);
  }

  function removeSection(section: Section) {
    setSelectedSections((previousSections) =>
      previousSections.filter(
        (selected) => selected.class_number !== section.class_number,
      ),
    );
  }

  function removeSelectedCourse(course: Course) {
    setSelectedCourses((previousCourses) =>
      previousCourses.filter(
        (selectedCourse) => selectedCourse.course_id !== course.course_id,
      ),
    );

    setSelectedSections((previousSections) =>
      previousSections.filter(
        (section) => section.course_id !== course.course_id,
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
    <main className="mt-4">
      <div className="flex flex-col gap-6 lg:h-[calc(100vh-8.5rem)] lg:min-h-[36rem] lg:flex-row">
        <CourseSearch
          className="max-h-[36rem] w-full overflow-y-auto pr-2 lg:h-full lg:max-h-none lg:w-[30%] lg:min-w-80 lg:shrink-0"
          courses={courses}
          selectedCourses={selectedCourses}
          selectedSections={selectedSections}
          expandedCourseIds={expandedCourseIds}
          addCourse={addCourse}
          removeCourse={removeSelectedCourse}
          selectSection={selectSection}
          removeSection={removeSection}
          dropdownCourse={toggleCourseDropdown}
        />

        <ScheduleCalendar
          className="h-[36rem] min-w-0 flex-1 lg:h-full"
          selectedSections={selectedSections}
        />
      </div>
    </main>
  );
}
