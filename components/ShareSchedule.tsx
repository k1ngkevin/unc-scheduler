"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  decodeSharedSchedule,
  type SharedSchedule,
} from "@/lib/sharedSchedules";
import { restoreSchedule } from "@/lib/savedSchedules";
import { courseListingKey } from "@/lib/courseIdentity";
import ScheduleCalendar from "./Calendar";

const buttonClass =
  "rounded-sm border border-line px-3 py-2 text-sm font-medium hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carolina-strong disabled:cursor-not-allowed disabled:opacity-40";

function ShareDialog({
  title,
  wide = false,
  onClose,
  children,
}: {
  title: string;
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    headingRef.current?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (
        opener instanceof HTMLElement &&
        opener !== document.body &&
        opener.isConnected &&
        !opener.matches(":disabled")
      ) {
        opener.focus();
      } else {
        document.getElementById("saved-schedules-button")?.focus();
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="share-dialog-heading"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={`m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] ${wide ? "max-w-5xl" : "max-w-lg"} overflow-y-auto rounded-lg border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/60`}
    >
      <div>
        <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-line bg-surface p-4 sm:px-6">
          <h2
            id="share-dialog-heading"
            ref={headingRef}
            tabIndex={-1}
            className="text-lg font-semibold outline-none"
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close share dialog"
            onClick={onClose}
            className="rounded-sm p-1.5 text-muted hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-carolina-strong"
          >
            <XMarkIcon aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="space-y-4 p-4 sm:p-6">{children}</div>
      </div>
    </dialog>
  );
}

export function ShareScheduleDialog({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Link copied!");
    } catch {
      inputRef.current?.focus();
      inputRef.current?.select();
      setStatus("Couldn't copy automatically. Copy the selected link below.");
    }
  }
  return (
    <ShareDialog title="Share schedule" onClose={onClose}>
      <p className="text-sm text-muted">
        Anyone with this link can view this schedule and save their own copy.
        Later edits won’t change this link.
      </p>
      <label
        htmlFor="schedule-share-link"
        className="block text-sm font-medium"
      >
        Schedule link
      </label>
      <input
        id="schedule-share-link"
        ref={inputRef}
        readOnly
        value={url}
        onFocus={(event) => event.target.select()}
        className="w-full rounded-sm border border-line bg-surface-muted p-3 text-sm focus-visible:outline-2 focus-visible:outline-carolina-strong"
      />
      <button type="button" className={buttonClass} onClick={copyLink}>
        Copy link
      </button>
      <p role="status" className="text-sm text-muted">
        {status}
      </p>
    </ShareDialog>
  );
}

type RestoredSchedule = ReturnType<typeof restoreSchedule>;

export function SharedSchedulePreview({
  token,
  semesterLabel,
  canSave,
  onSave,
  onClose,
}: {
  token: string;
  semesterLabel: (term: string) => string;
  canSave: boolean;
  onSave: (schedule: SharedSchedule) => boolean;
  onClose: () => void;
}) {
  const schedule = useMemo(() => {
    try {
      return decodeSharedSchedule(token);
    } catch {
      return null;
    }
  }, [token]);
  const [restored, setRestored] = useState<RestoredSchedule | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!schedule) return;
    const controller = new AbortController();
    async function loadPreview() {
      try {
        const project = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
        const response = await fetch(
          `https://${project}.supabase.co/storage/v1/object/public/course-data/scraped_data/${schedule!.term}.json`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Couldn't load shared courses");
        const data = await response.json();
        if (!Array.isArray(data.classes))
          throw new Error("Invalid course data");
        const result = restoreSchedule(schedule!, data.classes);
        if (!controller.signal.aborted) setRestored(result);
      } catch {
        if (!controller.signal.aborted)
          setLoadError(
            "Couldn't load this semester’s courses. Try again to preview the shared schedule.",
          );
      }
    }
    loadPreview();
    return () => controller.abort();
  }, [schedule, attempt]);

  return (
    <ShareDialog title="Shared schedule" wide={!!schedule} onClose={onClose}>
      {!schedule ? (
        <p role="alert" className="text-sm">
          This share link is invalid or unsupported. Ask the sender to copy a
          new link. Your current schedule has not changed.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="break-words text-lg font-semibold">
                {schedule.name}
              </h3>
              <p className="text-sm text-muted">
                {semesterLabel(schedule.term)} ·{" "}
                {schedule.selectedCourses.length} courses ·{" "}
                {schedule.selectedClassNumbers.length} sections
              </p>
            </div>
            <button
              type="button"
              disabled={!canSave || !restored}
              className={buttonClass}
              onClick={() => {
                if (onSave(schedule)) onClose();
                else
                  setSaveError(
                    "Couldn't save this copy. Browser storage may be full or unavailable. Your saved schedules have not changed.",
                  );
              }}
            >
              Save a copy
            </button>
          </div>
          <p className="text-sm text-muted">
            Preview only. Saving a copy adds it to Saved schedules and keeps
            your current draft open. Meeting details come from the latest course
            data.
          </p>
          {!canSave && (
            <p role="status" className="text-sm text-muted">
              Saving is unavailable until your saved schedules can be read. You
              can still preview this link.
            </p>
          )}
          {saveError && (
            <p role="alert" className="text-sm text-muted">
              {saveError}
            </p>
          )}
          {loadError ? (
            <div role="alert" className="space-y-3 text-sm">
              <p>{loadError}</p>
              <button
                type="button"
                className={buttonClass}
                onClick={() => {
                  setLoadError(null);
                  setAttempt((value) => value + 1);
                }}
              >
                Retry preview
              </button>
            </div>
          ) : !restored ? (
            <p role="status" className="text-sm text-muted">
              Loading shared schedule…
            </p>
          ) : (
            <>
              {(restored.missingClassNumbers.length > 0 ||
                restored.missingCourses.length > 0) && (
                <p
                  role="alert"
                  className="rounded-sm border border-line bg-surface-muted p-3 text-sm"
                >
                  Some shared classes are no longer available.{" "}
                  {restored.missingClassNumbers.length > 0 &&
                    `Missing class numbers: ${restored.missingClassNumbers.join(", ")}. `}
                  {restored.missingCourses.length > 0 &&
                    `Courses without sections: ${restored.missingCourses.map((course) => `${course.subject} ${course.course_number}`).join(", ")}. `}
                  Saving a copy preserves the original selections.
                </p>
              )}
              <ScheduleCalendar
                className="h-[28rem]"
                selectedSections={restored.sections}
              />
              <div>
                <h4 className="text-sm font-semibold">Courses and sections</h4>
                <ul className="mt-2 space-y-2 text-sm">
                  {restored.courses.map((course, index) => {
                    const sections = restored.sections.filter(
                      (section) =>
                        courseListingKey(section) === courseListingKey(course),
                    );
                    return (
                      <li key={`${courseListingKey(course)}-${index}`}>
                        <span className="font-medium">
                          {course.subject} {course.course_number}
                        </span>{" "}
                        — {course.title}
                        <ul className="ml-4 text-xs text-muted">
                          {sections.length === 0 ? (
                            <li>No available section selected</li>
                          ) : (
                            sections.map((section) => (
                              <li key={section.class_number}>
                                {section.component} {section.section} · #
                                {section.class_number} ·{" "}
                                {section.meetings.length === 0
                                  ? "No meeting time listed"
                                  : section.meetings
                                      .map(
                                        (meeting) =>
                                          `${meeting.days.join(" ") || "Days TBA"} ${meeting.start_time && meeting.end_time ? `${meeting.start_time}–${meeting.end_time}` : "Time TBA"}`,
                                      )
                                      .join("; ")}
                              </li>
                            ))
                          )}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
        </>
      )}
    </ShareDialog>
  );
}
