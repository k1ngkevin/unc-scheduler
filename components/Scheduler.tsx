"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { Course, CourseWithSections, Section, Building } from "@/lib/types";
import {
  courseKey,
  courseListingKey,
  sectionsForCourse,
  restoreCourseListings,
} from "@/lib/courseIdentity";
import CourseSearch from "./CourseSearch";
import ScheduleCalendar from "./Calendar";
import { Toaster, toast } from "sonner";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { format } from "timeago.js";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[36rem] flex-1 items-center justify-center rounded-sm border border-line bg-surface text-sm text-muted lg:h-full">
      Loading map…
    </div>
  ),
});

type ViewMode = "calendar" | "map";

const semesters = [
  { label: "Fall 2026", term: "2269" },
  { label: "Spring 2027", term: "2272" },
];

export default function Scheduler() {
  const [query, setQuery] = useState("");
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

  const [selectedTerm, setSelectedTerm] = useState("2272");
  const [lastUpdatedTime, setLastUpdatedTime] = useState("");

  useEffect(() => {
    async function fetchCourseData() {
      const file_name = `${selectedTerm}.json`;
      const supabase_id = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
      const api_url = `https://${supabase_id}.supabase.co/storage/v1/object/public/course-data/scraped_data/${file_name}`;
      try {
        const response = await fetch(api_url);

        if (!response.ok) {
          throw new Error(`response status: ${response.status}`);
        }

        const data = await response.json();
        const result: Section[] = data.classes;

        setAllSections(result);

        const dateUpdated = data.scraped_date;
        setLastUpdatedTime(format(dateUpdated));
      } catch (error) {
        console.error(error);
        toast.error("Couldn't load courses", {
          description: "Please check your connection and refresh the page.",
          id: "course-fetch-error",
        });
      }
    }
    fetchCourseData();
  }, [selectedTerm]);

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
        toast.error("Couldn't load building coordinates.", {
          description: "Please check your connection and refresh the page.",
          id: "building-fetch-error",
        });
      }
    }
    fetchBuildingCoords();
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("schedule");

      if (saved) {
        const data = JSON.parse(saved);

        const restored = restoreCourseListings(
          Array.isArray(data?.selectedCourses) ? data.selectedCourses : [],
          Array.isArray(data?.selectedSections) ? data.selectedSections : [],
        );
        setSelectedCourses(restored.courses);
        setSelectedSections(restored.sections);

        if (Array.isArray(data?.expandedCourseIds)) {
          setExpandedCourseIds(
            new Set(
              restored.courses
                .filter(
                  (course) =>
                    data.expandedCourseIds.includes(courseListingKey(course)) ||
                    data.expandedCourseIds.includes(course.course_id),
                )
                .map(courseListingKey),
            ),
          );
        }
      }
    } catch (error) {
      console.error("failed to load schedule from localStorage");
      toast.error("Couldn't load saved schedule.", {
        description: "Please check your connection and refresh the page.",
        id: "schedule-fetch-error",
      });
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
          expandedCourseIds: Array.from(expandedCourseIds),
        }),
      );
    } catch {
      console.error("failed to save to localStorage");
      toast.error("Couldn't save schedule.", {
        description: "Please check your connection.",
        id: "schedule-fetch-error",
      });
    }
  }, [selectedCourses, selectedSections, expandedCourseIds, storageLoaded]);

  const courses = useMemo<Course[]>(() => {
    const uniqueCourses = new Map<string, Course>();

    for (const section of allSections) {
      const key = courseListingKey(section);
      if (!uniqueCourses.has(key)) {
        uniqueCourses.set(key, {
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
        (selected) => courseKey(selected) === courseKey(course),
      );

      if (alreadySelected) {
        return previousCourses;
      }

      const courseWithSections: CourseWithSections = {
        ...course,
        sections: sectionsForCourse(course, allSections),
      };
      return [...previousCourses, courseWithSections];
    });
  }

  function selectSection(section: Section) {
    setSelectedSections((previousSections) => [
      ...previousSections.filter(
        (selected) =>
          courseKey(selected) !== courseKey(section) ||
          selected.component !== section.component,
      ),
      section,
    ]);
  }

  function removeSection(section: Section) {
    setSelectedSections((previousSections) =>
      previousSections.filter(
        (selected) =>
          selected.term !== section.term ||
          selected.class_number !== section.class_number,
      ),
    );
  }

  function removeSelectedCourse(course: Course) {
    setSelectedCourses((previousCourses) =>
      previousCourses.filter(
        (selectedCourse) =>
          courseListingKey(selectedCourse) !== courseListingKey(course),
      ),
    );

    setSelectedSections((previousSections) =>
      previousSections.filter(
        (section) => courseListingKey(section) !== courseListingKey(course),
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
      <Toaster position="top-center" richColors closeButton />
      <header className="sticky top-0 z-[1100] border-b border-line bg-surface">
        <nav
          className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6"
          aria-label="Main navigation"
        >
          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            <h1 className="whitespace-nowrap text-lg font-semibold tracking-tight sm:text-xl">
              <span className="text-carolina-strong">UNC</span> Scheduler
            </h1>

            <div className="relative">
              <select
                aria-label="Semester"
                value={selectedTerm}
                onChange={(event) => setSelectedTerm(event.target.value)}
                className="cursor-pointer appearance-none rounded-sm border border-line bg-surface-muted py-2 pl-3 pr-9 text-xs font-medium text-ink transition-colors hover:border-carolina focus-visible:border-carolina focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carolina-strong sm:text-sm"
              >
                {semesters.map((semester) => (
                  <option key={semester.term} value={semester.term}>
                    {semester.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              />
            </div>
          </div>

          <div
            className="ml-auto inline-flex shrink-0 gap-1 rounded-sm bg-surface-muted p-1"
            role="group"
            aria-label="Schedule view"
          >
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              aria-pressed={viewMode === "calendar"}
              className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carolina-strong sm:px-4 sm:text-sm ${
                viewMode === "calendar"
                  ? "bg-carolina text-on-carolina"
                  : "text-muted hover:bg-surface hover:text-ink"
              }`}
            >
              Calendar
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              aria-pressed={viewMode === "map"}
              className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carolina-strong sm:px-4 sm:text-sm ${
                viewMode === "map"
                  ? "bg-carolina text-on-carolina"
                  : "text-muted hover:bg-surface hover:text-ink"
              }`}
            >
              Map
            </button>
          </div>
        </nav>
      </header>

      <main className="flex-1 px-4 pt-6 pb-20 sm:px-6">
        <div className="flex flex-col lg:h-[calc(100vh-7rem)] lg:min-h-[36rem] lg:flex-row">
          {viewMode === "calendar" ? (
            <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row">
              <CourseSearch
                query={query}
                setQuery={setQuery}
                className="max-h-[36rem] w-full overflow-y-auto pr-2 lg:h-full lg:max-h-none lg:w-[24%] lg:min-w-72 lg:shrink-0"
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
              className="h-[36rem] min-w-0 flex-none lg:h-full lg:flex-1"
              selectedSections={selectedSections}
              buildingCoords={buildingCodeCoords}
            />
          )}
        </div>
      </main>
      <footer className="fixed inset-x-0 bottom-0 z-[1100] border-t border-line bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-xs text-muted sm:px-6">
        <p role="status">
          Course data last updated: {lastUpdatedTime || "Unavailable"}
        </p>
      </footer>
    </div>
  );
}
