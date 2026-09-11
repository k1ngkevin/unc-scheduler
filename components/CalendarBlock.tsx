"use client";

import { useState } from "react";
import { PositionedEvent } from "@/lib/types";
import { to12Hour } from "@/lib/time";
import {
  useHover,
  useFloating,
  useInteractions,
  offset,
  flip,
} from "@floating-ui/react";

type CalendarBlockProps = {
  event: PositionedEvent;
  getMeetingStyle: (
    startTime: string,
    endTime: string,
  ) => { top: number; height: number };
};

export default function CalendarBlock({
  event,
  getMeetingStyle,
}: CalendarBlockProps) {
  const { top, height } = getMeetingStyle(
    event.meeting.start_time!,
    event.meeting.end_time!,
  );

  const leftPercent = (event.lane / event.laneCount) * 100;
  const widthPercent = 100 / event.laneCount;
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: "top",
    middleware: [offset(8), flip()],
  });

  const hover = useHover(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);

  return (
    <>
      <div
        className="absolute overflow-hidden rounded-sm border-l-[3px] border-carolina bg-carolina-light p-1 text-ink"
        ref={refs.setReference}
        {...getReferenceProps()}
        style={{
          top: `${top}px`,
          height: `${height}px`,
          left: `calc(${leftPercent}% + 2px)`,
          width: `calc(${widthPercent}% - 4px)`,
        }}
      >
        <h3 className="truncate text-xs font-semibold">
          {event.section.subject} {event.section.course_number}
        </h3>
        <p className="truncate text-xs leading-[12px]">
          {event.meeting.building} {event.meeting.room}
        </p>
        <p className="truncate text-xs leading-[12px]">
          {event.meeting.start_time && event.meeting.end_time
            ? `${to12Hour(event.meeting.start_time)}–${to12Hour(event.meeting.end_time)}`
            : "TBA"}
        </p>
        <p className="truncate text-xs leading-[12px]">
          {event.section.instructors[0]?.name?.trim() || "not found"}
        </p>
      </div>

      {isOpen && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
          className="rounded-sm border bg-surface p-3 text-ink shadow-lg z-50"
        >
          <p className="truncate text-xs">Course Name: {event.section.title}</p>
          <p className="truncate text-xs">
            Instructors: {event.section.instructors[0].name}
          </p>
          <p className="truncate text-xs">
            Location: {event.meeting.building} {event.meeting.room}
          </p>
          {}
          <p className="truncate text-xs">
            Credits:{" "}
            {event.section.section_type === "REC"
              ? "Recitation"
              : event.section.max_credits}
          </p>
        </div>
      )}
    </>
  );
}
