"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { CourseWithSections, Section } from "@/lib/types";
import {
  generateSchedules,
  scheduleMetrics,
  sortSchedules,
  type GenerationResult,
  type ScheduleSort,
} from "@/lib/generateSchedules";
import { to12Hour } from "@/lib/time";
import ScheduleCalendar from "./Calendar";

const buttonClass =
  "rounded-sm border border-line px-3 py-2 text-xs font-medium hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carolina-strong disabled:cursor-not-allowed disabled:opacity-40";

const descriptions: Record<ScheduleSort, string> = {
  "earliest-end":
    "Finish earlier: minimize the latest class end time across the week.",
  "latest-start":
    "Start later: maximize the earliest class start time across the week.",
  "most-compact":
    "Minimize the total time between classes on the same day, summed across the week.",
};

function displayTime(minutes: number | null) {
  if (minutes === null) return "TBA";
  return to12Hour(
    `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`,
  );
}

export default function GeneratedSchedules({
  courses,
  onApply,
  onClose,
}: {
  courses: CourseWithSections[];
  onApply: (sections: Section[]) => void;
  onClose: () => void;
}) {
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState<ScheduleSort>("earliest-end");
  const [index, setIndex] = useState(0);
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
        opener.isConnected &&
        opener !== document.body &&
        !opener.matches(":disabled")
      ) {
        opener.focus();
      } else {
        document.getElementById("generate-schedules-button")?.focus();
      }
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    generateSchedules(courses, { signal: controller.signal }).then(
      (generated) => {
        if (!controller.signal.aborted) setResult(generated);
      },
      () => {
        if (!controller.signal.aborted) setError(true);
      },
    );
    return () => controller.abort();
  }, [courses]);

  const scoredSchedules = useMemo(
    () =>
      result?.schedules.map((sections) => ({
        sections,
        metrics: scheduleMetrics(sections),
      })) ?? [],
    [result],
  );
  const sortedSchedules = useMemo(
    () => sortSchedules(scoredSchedules, sort),
    [scoredSchedules, sort],
  );
  const current = sortedSchedules[index];

  return (
    <dialog
      id="generated-schedules-dialog"
      ref={dialogRef}
      aria-labelledby="generated-schedules-heading"
      aria-describedby="generated-schedules-help"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-6xl overflow-y-auto rounded-lg border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/60"
    >
      <div>
        <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-line bg-surface p-4 sm:px-6">
          <div>
            <h2
              id="generated-schedules-heading"
              ref={headingRef}
              tabIndex={-1}
              className="text-lg font-semibold outline-none"
            >
              Generate schedules
            </h2>
            <p id="generated-schedules-help" className="mt-1 text-xs text-muted">
              Compare section combinations for your {courses.length} selected
              courses. Your choices save when you use an option.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close generated schedules"
            onClick={onClose}
            className="rounded-sm p-1.5 text-muted hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-carolina-strong"
          >
            <XMarkIcon aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <label
                htmlFor="generated-schedules-sort"
                className="mr-3 text-sm font-medium"
              >
                Sort by
              </label>
              <select
                id="generated-schedules-sort"
                aria-label="Sort generated schedules"
                aria-describedby="generated-schedules-sort-help"
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as ScheduleSort);
                  setIndex(0);
                }}
                className="max-w-full rounded-sm border border-line bg-surface-muted px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-carolina-strong"
              >
                <option value="earliest-end">Earliest end time</option>
                <option value="latest-start">Latest start time</option>
                <option value="most-compact">Most compact</option>
              </select>
              <p
                id="generated-schedules-sort-help"
                className="mt-2 max-w-xl text-xs leading-relaxed text-muted"
              >
                {descriptions[sort]} Schedules with unknown meeting times appear
                last.
              </p>
            </div>
            {current && (
              <button
                type="button"
                onClick={() => onApply(current.sections)}
                className="shrink-0 rounded-sm bg-carolina px-4 py-2 text-sm font-medium text-on-carolina hover:bg-carolina-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carolina-strong"
              >
                Use this schedule
              </button>
            )}
          </div>

          {!result && !error && (
            <p role="status" className="py-8 text-sm text-muted">
              Finding schedules…
            </p>
          )}
          {error && (
            <p role="alert" className="py-4 text-sm">
              Couldn’t generate schedules. Close this window and try again.
            </p>
          )}
          {result?.limited && (
            <p
              role="status"
              className="rounded-sm border border-line bg-surface-muted p-3 text-xs leading-relaxed"
            >
              Search limit reached. Showing{" "}
              {result.schedules.length.toLocaleString()} options found so far;
              better options may exist. Try fewer courses to search more
              completely.
            </p>
          )}
          {result && !current && (
            <p role="status" className="py-8 text-sm text-muted">
              {result.limited
                ? "No compatible options found before the search limit. Try fewer courses."
                : "No compatible schedules found. Try removing a course or checking its available sections."}
            </p>
          )}
          {current && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <p
                  role="status"
                  aria-live="polite"
                  className="text-sm font-medium tabular-nums"
                >
                  Option {index + 1} of {sortedSchedules.length.toLocaleString()}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={buttonClass}
                    disabled={index === 0}
                    aria-label="Previous generated schedule"
                    onClick={() => setIndex(index - 1)}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className={buttonClass}
                    disabled={index === sortedSchedules.length - 1}
                    aria-label="Next generated schedule"
                    onClick={() => setIndex(index + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
              <dl className="grid grid-cols-1 gap-3 rounded-sm bg-surface-muted p-3 text-xs sm:grid-cols-3">
                <div>
                  <dt className="text-muted">Earliest start</dt>
                  <dd className="mt-1 font-medium">
                    {displayTime(current.metrics.earliestStart)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Latest end</dt>
                  <dd className="mt-1 font-medium">
                    {displayTime(current.metrics.latestEnd)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Gaps per week</dt>
                  <dd className="mt-1 font-medium">
                    {current.metrics.gapMinutes} min
                  </dd>
                </div>
              </dl>
              {current.metrics.untimedSections > 0 && (
                <p className="text-xs text-muted">
                  {current.metrics.untimedSections} section(s) have unknown
                  meeting times. Times and gaps above use known meetings only;
                  check for additional conflicts.
                </p>
              )}
              <ScheduleCalendar
                className="h-[28rem] sm:h-[32rem]"
                selectedSections={current.sections}
              />
              <ul
                className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
                aria-label="Generated sections"
              >
                {current.sections.map((section) => (
                  <li
                    key={`${section.term}:${section.class_number}`}
                    className="rounded-sm border border-line p-3 text-xs"
                  >
                    <p className="font-medium">
                      {section.subject} {section.course_number} ·{" "}
                      {section.component ?? "Section"} {section.section}
                    </p>
                    <p className="mt-1 text-muted">
                      Class {section.class_number} · {section.available_seats}{" "}
                      seats available
                    </p>
                    {section.meetings.length === 0 && (
                      <p className="mt-1 text-muted">Time TBA</p>
                    )}
                    {section.meetings.map((meeting, meetingIndex) => (
                      <p key={meetingIndex} className="mt-1 text-muted">
                        {meeting.days.join(", ") || "Days TBA"}{" "}
                        {meeting.start_time && meeting.end_time
                          ? `${to12Hour(meeting.start_time)}–${to12Hour(meeting.end_time)}`
                          : "Time TBA"}
                      </p>
                    ))}
                  </li>
                ))}
              </ul>
              <p className="text-xs leading-relaxed text-muted">
                Includes one section per listed component. Verify linked-section
                rules, enrollment restrictions, and current seats in
                ConnectCarolina.
              </p>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
