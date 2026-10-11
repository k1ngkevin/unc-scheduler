"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Course,
  CourseWithSections,
  Section,
  Building,
  SavedSchedule,
} from "@/lib/types";
import {
  courseKey,
  courseListingKey,
  sectionsForCourse,
} from "@/lib/courseIdentity";
import {
  createScheduleSelection,
  parseSavedSchedules,
  parseScheduleDraft,
  restoreSchedule,
  schedulesMatch,
  SAVED_SCHEDULES_KEY,
  DRAFT_SCHEDULE_KEY,
  type ScheduleDraft,
} from "@/lib/savedSchedules";
import CourseSearch from "./CourseSearch";
import SavedSchedules from "./SavedSchedules";
import { ShareScheduleDialog, SharedSchedulePreview } from "./ShareSchedule";
import {
  createShareUrl,
  sharedCopyName,
  type SharedSchedule,
} from "@/lib/sharedSchedules";
import ScheduleCalendar from "./Calendar";
import { Toaster, toast } from "sonner";
import { ChevronDownIcon, ShareIcon } from "@heroicons/react/24/outline";
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

function semesterLabel(term: string) {
  return (
    semesters.find((semester) => semester.term === term)?.label ??
    `Term ${term}`
  );
}

function emptyDraft(term: string): ScheduleDraft {
  return {
    term,
    selectedCourses: [],
    selectedClassNumbers: [],
    expandedCourseIds: [],
    activeScheduleId: null,
  };
}

export default function Scheduler() {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<CourseWithSections[]>(
    [],
  );
  const [selectedSections, setSelectedSections] = useState<Section[]>([]);
  const [previewSection, setPreviewSection] = useState<Section | null>(null);
  const [expandedCourseIds, setExpandedCourseIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [storageLoaded, setStorageLoaded] = useState<boolean>(false);
  const [savedSchedules, setSavedSchedules] = useState<SavedSchedule[]>([]);
  const [schedulesMode, setSchedulesMode] = useState<"list" | "save" | null>(
    null,
  );
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharedToken, setSharedToken] = useState<string | null>(null);
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);
  const [savedSchedulesAvailable, setSavedSchedulesAvailable] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [pendingLoad, setPendingLoad] = useState<ScheduleDraft | null>(null);
  const [failedLoad, setFailedLoad] = useState<ScheduleDraft | null>(null);
  const [buildingCodeCoords, setBuildingCodeCoords] = useState<
    Record<string, Building>
  >({});

  const [selectedTerm, setSelectedTerm] = useState("2272");
  const [lastUpdatedTime, setLastUpdatedTime] = useState("");

  useEffect(() => {
    let cancelled = false;
    function readSharedLink() {
      if (cancelled) return;
      const hash = window.location.hash;
      const token = hash.startsWith("#share=") ? hash.slice(7) : null;
      setSharedToken(token);
      if (token !== null) {
        setShareUrl(null);
        setSchedulesMode(null);
        setPreviewSection(null);
      }
    }
    queueMicrotask(readSharedLink);
    window.addEventListener("hashchange", readSharedLink);
    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", readSharedLink);
    };
  }, []);

  useEffect(() => {
    if (!pendingLoad) return;
    const request = pendingLoad;
    const controller = new AbortController();
    async function fetchCourseData() {
      const file_name = `${request.term}.json`;
      const supabase_id = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
      const api_url = `https://${supabase_id}.supabase.co/storage/v1/object/public/course-data/scraped_data/${file_name}`;
      try {
        const response = await fetch(api_url, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`response status: ${response.status}`);
        }

        const data = await response.json();
        if (!Array.isArray(data.classes))
          throw new Error("Invalid course data");
        const result: Section[] = data.classes;
        if (controller.signal.aborted) return;
        const restored = restoreSchedule(request, result);

        setAllSections(result);
        setSelectedTerm(request.term);
        setSelectedCourses(restored.courses);
        setSelectedSections(restored.sections);
        setExpandedCourseIds(new Set(request.expandedCourseIds));
        setActiveScheduleId(request.activeScheduleId);
        setPreviewSection(null);
        setQuery("");
        setDraftReady(true);
        setPendingLoad(null);
        setFailedLoad(null);
        setSchedulesMode(null);
        const dateUpdated = data.scraped_date;
        setLastUpdatedTime(format(dateUpdated));
        if (
          restored.missingClassNumbers.length ||
          restored.missingCourses.length
        ) {
          toast.warning("Some saved classes are unavailable", {
            description: [
              restored.missingClassNumbers.length
                ? `Missing class numbers: ${restored.missingClassNumbers.join(", ")}.`
                : "",
              restored.missingCourses.length
                ? `Courses without sections: ${restored.missingCourses.map((course) => `${course.subject} ${course.course_number}`).join(", ")}.`
                : "",
              "Your named schedule has not been changed.",
            ]
              .filter(Boolean)
              .join(" "),
            duration: 10000,
          });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(error);
        setFailedLoad(request);
        setPendingLoad(null);
        toast.error("Couldn't load courses", {
          description: "Your current schedule was kept. Try loading again.",
          id: "course-fetch-error",
        });
      }
    }
    fetchCourseData();
    return () => controller.abort();
  }, [pendingLoad]);

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
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      let schedules: SavedSchedule[] = [];
      try {
        schedules = parseSavedSchedules(
          localStorage.getItem(SAVED_SCHEDULES_KEY),
        );
        setSavedSchedules(schedules);
        setSavedSchedulesAvailable(true);
      } catch {
        toast.error("Couldn't read saved schedules", {
          description:
            "The stored list has not been overwritten. Check browser storage access and reload.",
        });
      }
      let draft = emptyDraft("2272");
      try {
        draft = parseScheduleDraft(
          localStorage.getItem(DRAFT_SCHEDULE_KEY),
          "2272",
        );
      } catch {
        toast.error("Couldn't read your schedule draft", {
          description:
            "You can still load a named schedule from the saved list.",
        });
      }
      if (
        !schedules.some((schedule) => schedule.id === draft.activeScheduleId)
      ) {
        draft.activeScheduleId = null;
      }
      setPendingLoad(draft);
      setStorageLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!storageLoaded || !draftReady || pendingLoad || sharedToken !== null) {
      return;
    }

    try {
      localStorage.setItem(
        DRAFT_SCHEDULE_KEY,
        JSON.stringify({
          ...createScheduleSelection(
            selectedTerm,
            selectedCourses,
            selectedSections,
          ),
          expandedCourseIds: Array.from(expandedCourseIds),
          activeScheduleId,
        }),
      );
    } catch {
      toast.error("Couldn't save your draft in this browser", {
        description:
          "Browser storage may be full or unavailable. Your current work is still open.",
        id: "draft-save-error",
      });
    }
  }, [
    selectedCourses,
    selectedSections,
    selectedTerm,
    expandedCourseIds,
    activeScheduleId,
    storageLoaded,
    draftReady,
    pendingLoad,
    sharedToken,
  ]);

  const currentSelection = createScheduleSelection(
    selectedTerm,
    selectedCourses,
    selectedSections,
  );
  const activeSchedule = savedSchedules.find(
    (schedule) => schedule.id === activeScheduleId,
  );
  const hasChanges = activeSchedule
    ? !schedulesMatch(currentSelection, activeSchedule)
    : selectedCourses.length > 0;
  const isLoading = !storageLoaded || pendingLoad !== null;

  function persistSavedSchedules(next: SavedSchedule[]): boolean {
    if (!savedSchedulesAvailable) return false;
    try {
      localStorage.setItem(SAVED_SCHEDULES_KEY, JSON.stringify(next));
      setSavedSchedules(next);
      return true;
    } catch {
      setScheduleError(
        "Couldn't save schedules. Browser storage may be full or unavailable; your saved list has not changed.",
      );
      toast.error("Couldn't save schedules in this browser", {
        description:
          "Browser storage may be full or unavailable. Your saved list has not changed.",
      });
      return false;
    }
  }

  function saveNewSchedule(name: string): boolean {
    if (isLoading || !draftReady || !name.trim()) return false;
    if (
      savedSchedules.some(
        (schedule) => schedule.name.toLowerCase() === name.trim().toLowerCase(),
      )
    ) {
      setScheduleError(
        "A schedule with that name already exists. Choose another name to save a separate copy.",
      );
      toast.error("A schedule with that name already exists", {
        description: "Choose another name to save a separate copy.",
      });
      return false;
    }
    const schedule: SavedSchedule = {
      ...currentSelection,
      id: crypto.randomUUID(),
      name: name.trim(),
    };
    if (!persistSavedSchedules([...savedSchedules, schedule])) return false;
    setActiveScheduleId(schedule.id);
    setSchedulesMode(null);
    setScheduleError(null);
    toast.success(`Saved ${schedule.name}`);
    return true;
  }

  function shareSchedule() {
    if (isLoading || !draftReady) return;
    try {
      setPreviewSection(null);
      setShareUrl(
        createShareUrl(
          {
            ...currentSelection,
            name: activeSchedule?.name ?? "Shared schedule",
          },
          window.location.href,
        ),
      );
    } catch {
      toast.error("Couldn't create a share link", {
        description: "This schedule is too large or contains unsupported data.",
      });
    }
  }

  function saveSharedCopy(shared: SharedSchedule): boolean {
    const copy: SavedSchedule = {
      ...shared,
      id: crypto.randomUUID(),
      name: sharedCopyName(shared.name, savedSchedules),
    };
    if (!persistSavedSchedules([...savedSchedules, copy])) return false;
    setScheduleError(null);
    toast.success(`Saved ${copy.name}`, {
      description:
        "Open Saved schedules to load your copy. Your current draft was kept.",
    });
    return true;
  }

  function closeSharedPreview() {
    setSharedToken(null);
    if (window.location.hash.startsWith("#share=")) {
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search,
      );
    }
  }

  function saveScheduleChanges() {
    if (!activeSchedule || isLoading || !draftReady) return;
    const updated = { ...activeSchedule, ...currentSelection };
    if (
      persistSavedSchedules(
        savedSchedules.map((schedule) =>
          schedule.id === updated.id ? updated : schedule,
        ),
      )
    ) {
      setScheduleError(null);
      toast.success(`Updated ${updated.name}`);
    }
  }

  function canReplaceDraft() {
    return (
      !hasChanges ||
      window.confirm(
        "Replace the current draft? Changes that you haven't saved to a named schedule will be lost.",
      )
    );
  }

  function loadSchedule(schedule: SavedSchedule) {
    if (isLoading || !canReplaceDraft()) return;
    setFailedLoad(null);
    setScheduleError(null);
    setPreviewSection(null);
    setPendingLoad({
      ...schedule,
      activeScheduleId: schedule.id,
      expandedCourseIds: schedule.selectedCourses.map(courseListingKey),
    });
    setViewMode("calendar");
  }

  function startNewDraft(term: string) {
    if (isLoading || !canReplaceDraft()) return;
    setFailedLoad(null);
    setScheduleError(null);
    setPreviewSection(null);
    setPendingLoad(emptyDraft(term));
  }

  function openSavedSchedules(mode: "list" | "save") {
    setPreviewSection(null);
    setScheduleError(null);
    setSchedulesMode(mode);
  }

  function retryLoad() {
    if (!failedLoad || !canReplaceDraft()) return;
    setPendingLoad(failedLoad);
    setFailedLoad(null);
    setScheduleError(null);
  }

  function deleteSchedule(schedule: SavedSchedule) {
    if (
      !window.confirm(
        `Delete "${schedule.name}" from saved schedules? Your current draft will stay open.`,
      )
    )
      return;
    if (
      persistSavedSchedules(
        savedSchedules.filter((item) => item.id !== schedule.id),
      )
    ) {
      setScheduleError(null);
      if (activeScheduleId === schedule.id) setActiveScheduleId(null);
      toast.success(`Deleted ${schedule.name}`);
    }
  }

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

  function updateCurrentSchedule(
    courses: CourseWithSections[],
    sections: Section[],
  ) {
    if (isLoading || !draftReady) return;
    setSelectedCourses(courses);
    setSelectedSections(sections);

    // Persist actual edits immediately; loading or previewing a plan must not overwrite it.
    if (activeSchedule) {
      const updated = {
        ...activeSchedule,
        ...createScheduleSelection(selectedTerm, courses, sections),
      };
      if (
        persistSavedSchedules(
          savedSchedules.map((schedule) =>
            schedule.id === updated.id ? updated : schedule,
          ),
        )
      ) {
        setScheduleError(null);
      }
    }
  }

  function addCourse(course: Course) {
    if (
      selectedCourses.some(
        (selected) => courseKey(selected) === courseKey(course),
      )
    )
      return;
    updateCurrentSchedule(
      [
        ...selectedCourses,
        { ...course, sections: sectionsForCourse(course, allSections) },
      ],
      selectedSections,
    );
  }

  function selectSection(section: Section) {
    setPreviewSection(null);
    updateCurrentSchedule(selectedCourses, [
      ...selectedSections.filter(
        (selected) =>
          courseKey(selected) !== courseKey(section) ||
          selected.component !== section.component,
      ),
      section,
    ]);
  }

  function removeSection(section: Section) {
    setPreviewSection(null);
    updateCurrentSchedule(
      selectedCourses,
      selectedSections.filter(
        (selected) =>
          selected.term !== section.term ||
          selected.class_number !== section.class_number,
      ),
    );
  }

  function removeSelectedCourse(course: Course) {
    setPreviewSection(null);
    updateCurrentSchedule(
      selectedCourses.filter(
        (selectedCourse) =>
          courseListingKey(selectedCourse) !== courseListingKey(course),
      ),
      selectedSections.filter(
        (section) => courseListingKey(section) !== courseListingKey(course),
      ),
    );
  }

  function toggleCourseDropdown(courseId: string) {
    setPreviewSection(null);
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
    <div className="flex min-h-screen flex-col font-sans lg:h-dvh lg:min-h-0">
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
                value={pendingLoad?.term ?? selectedTerm}
                disabled={isLoading}
                onChange={(event) => startNewDraft(event.target.value)}
                className="cursor-pointer appearance-none rounded-sm border border-line bg-surface-muted py-2 pl-3 pr-9 text-xs font-medium text-ink transition-colors hover:border-carolina focus-visible:border-carolina focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carolina-strong sm:text-sm"
              >
                {semesters.map((semester) => (
                  <option key={semester.term} value={semester.term}>
                    {semester.label}
                  </option>
                ))}
                {!semesters.some(
                  (semester) =>
                    semester.term === (pendingLoad?.term ?? selectedTerm),
                ) && (
                  <option value={pendingLoad?.term ?? selectedTerm}>
                    {semesterLabel(pendingLoad?.term ?? selectedTerm)}
                  </option>
                )}
              </select>
              <ChevronDownIcon
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              />
            </div>
          </div>

          <div
            className="flex min-w-0 max-w-full flex-wrap items-center gap-2"
            aria-label="Schedule controls"
          >
            <p
              role="status"
              className="flex min-w-0 max-w-64 items-center gap-1 text-xs text-muted"
              title={activeSchedule?.name ?? "Untitled draft"}
            >
              <span className="min-w-0 truncate font-medium text-ink">
                {activeSchedule?.name ?? "Untitled draft"}
              </span>
            </p>
            {(!activeSchedule || hasChanges) && (
              <button
                type="button"
                aria-label={activeSchedule ? "Save changes" : "Save schedule"}
                disabled={
                  isLoading ||
                  !savedSchedulesAvailable ||
                  !draftReady ||
                  (!!activeSchedule && !hasChanges)
                }
                onClick={() =>
                  activeSchedule
                    ? saveScheduleChanges()
                    : openSavedSchedules("save")
                }
                className="rounded-sm bg-carolina px-3 py-2 text-xs font-medium text-on-carolina hover:bg-carolina-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carolina-strong disabled:cursor-not-allowed disabled:opacity-40"
              >
                {activeSchedule ? "Save changes" : "Save"}
              </button>
            )}
            <button
              type="button"
              id="saved-schedules-button"
              disabled={!storageLoaded}
              aria-haspopup="dialog"
              aria-controls="saved-schedules-dialog"
              aria-expanded={schedulesMode !== null}
              onClick={() => openSavedSchedules("list")}
              className="rounded-sm border border-line bg-surface-muted px-3 py-2 text-xs font-medium hover:border-carolina focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carolina-strong disabled:opacity-40"
            >
              Saved schedules
            </button>
            <button
              type="button"
              aria-label="Share schedule"
              aria-haspopup="dialog"
              disabled={
                isLoading || !draftReady || selectedCourses.length === 0
              }
              onClick={shareSchedule}
              className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-surface-muted px-3 py-2 text-xs font-medium hover:border-carolina focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carolina-strong disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ShareIcon aria-hidden="true" className="size-4" />
              Share
            </button>
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
              onClick={() => {
                setPreviewSection(null);
                setViewMode("map");
              }}
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

      <main className="flex-1 px-4 pt-6 pb-20 sm:px-6 lg:flex lg:min-h-0 lg:flex-col">
        <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row">
          {viewMode === "calendar" ? (
            <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row">
              <aside className="max-h-[36rem] w-full overflow-y-auto pr-2 lg:h-full lg:max-h-none lg:w-[24%] lg:min-w-72 lg:shrink-0">
                {isLoading && (
                  <p role="status" className="mb-3 text-xs text-muted">
                    Loading {semesterLabel(pendingLoad?.term ?? selectedTerm)}{" "}
                    courses…
                  </p>
                )}
                {failedLoad && (
                  <div
                    role="alert"
                    className="mb-3 rounded-sm border border-line p-3 text-xs"
                  >
                    <p>
                      Couldn’t load {semesterLabel(failedLoad.term)}. Your
                      current schedule was kept.
                    </p>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={retryLoad}
                      className="mt-2 rounded-sm text-carolina-strong underline focus-visible:outline-2 focus-visible:outline-carolina"
                    >
                      Retry loading courses
                    </button>
                  </div>
                )}
                <fieldset
                  aria-label="Course selection"
                  disabled={isLoading || !draftReady}
                  className="min-w-0 disabled:opacity-50"
                >
                  <CourseSearch
                    query={query}
                    setQuery={setQuery}
                    courses={courses}
                    selectedCourses={selectedCourses}
                    selectedSections={selectedSections}
                    expandedCourseIds={expandedCourseIds}
                    addCourse={addCourse}
                    removeCourse={removeSelectedCourse}
                    selectSection={selectSection}
                    removeSection={removeSection}
                    onPreviewSection={setPreviewSection}
                    dropdownCourse={toggleCourseDropdown}
                  />
                </fieldset>
              </aside>
              <ScheduleCalendar
                className="h-[36rem] min-w-0 flex-1 lg:h-full"
                selectedSections={selectedSections}
                previewSection={previewSection}
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
      {shareUrl && (
        <ShareScheduleDialog url={shareUrl} onClose={() => setShareUrl(null)} />
      )}
      {sharedToken !== null && (
        <SharedSchedulePreview
          key={sharedToken}
          token={sharedToken}
          semesterLabel={semesterLabel}
          canSave={savedSchedulesAvailable}
          onSave={saveSharedCopy}
          onClose={closeSharedPreview}
        />
      )}
      {schedulesMode && (
        <SavedSchedules
          schedules={savedSchedules}
          activeScheduleId={activeScheduleId}
          hasChanges={hasChanges}
          disabled={isLoading || !savedSchedulesAvailable}
          canSave={draftReady}
          initialMode={schedulesMode}
          loadingMessage={
            pendingLoad
              ? `Loading ${semesterLabel(pendingLoad.term)} courses…`
              : undefined
          }
          errorMessage={
            scheduleError ??
            (!savedSchedulesAvailable
              ? "Saved schedules are unavailable in this browser. Reload to try again."
              : failedLoad
                ? `Couldn't load ${semesterLabel(failedLoad.term)}. Your current schedule was kept.`
                : undefined)
          }
          onRetryLoad={failedLoad ? retryLoad : undefined}
          semesterLabel={semesterLabel}
          onSaveNew={saveNewSchedule}
          onSaveChanges={saveScheduleChanges}
          onLoad={loadSchedule}
          onDelete={deleteSchedule}
          onNew={() => startNewDraft(selectedTerm)}
          onClose={() => setSchedulesMode(null)}
        />
      )}
    </div>
  );
}
