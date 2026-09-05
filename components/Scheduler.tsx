"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { Course, CourseWithSections, Section, Building } from "@/lib/types";
import CourseSearch from "./CourseSearch";
import ScheduleCalendar from "./Calendar";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[36rem] flex-1 items-center justify-center rounded-lg bg-zinc-900 text-zinc-400 lg:h-full">
      Loading map…
    </div>
  ),
});

type ViewMode = "calendar" | "map";

export default function Scheduler() {
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<CourseWithSections[]>(
    [],
  );
  const [selectedSections, setSelectedSections] = useState<Section[]>([]);
  const [expandedCourseIds, setExpandedCourseIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [storageLoaded, setStorageLoaded] = useState<boolean>(false);
  const [buildingCodeCoords, setBuildingCodeCoords] = useState<
    Record<string, Building>
  >({});

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
    async function fetchBuildingCoords() {
      const file_name = "building_code_coords.json";
      const supabase_id = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
      const api_url = `https://${supabase_id}.supabase.co/storage/v1/object/public/course-data/scraped_data/${file_name}`;
      try {
        const response = await fetch(api_url);

        if (!response.ok) {
          throw new Error(`response status: ${response.status}`);
        }

        const result: Record<string, Building> = await response.json();
        setBuildingCodeCoords(result);
      } catch (error) {
        console.error(error);
      }
    }
    fetchBuildingCoords();
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
    <div className="flex min-h-screen flex-col font-sans">
      <header className="sticky top-0 z-[1100] border-b border-zinc-800 bg-[#101010]/95 backdrop-blur">
        <nav
          className="flex h-16 items-center justify-between px-6 sm:px-10"
          aria-label="Main navigation"
        >
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            UNC Scheduler
          </h1>

          <div
            className="inline-flex rounded-lg bg-zinc-900 p-1"
            role="group"
            aria-label="Schedule view"
          >
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              aria-pressed={viewMode === "calendar"}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === "calendar"
                  ? "bg-pink-500 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Calendar
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              aria-pressed={viewMode === "map"}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === "map"
                  ? "bg-pink-500 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Map
            </button>
          </div>
        </nav>
      </header>

      <main className="flex-1 px-6 py-6 sm:px-10">
        <div className="flex flex-col gap-6 lg:h-[calc(100vh-7rem)] lg:min-h-[36rem] lg:flex-row">
          {viewMode === "calendar" ? (
            <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
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
          ) : (
            <MapView
              className="h-[36rem] min-w-0 flex-1 lg:h-full"
              selectedSections={selectedSections}
              buildingCoords={buildingCodeCoords}
            />
          )}
        </div>
      </main>
    </div>
  );
}
