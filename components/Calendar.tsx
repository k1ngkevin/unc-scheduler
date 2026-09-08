import { Section, PositionedEvent } from "@/lib/types";
import { to12Hour } from "@/lib/time";
import { timeToMinutes } from "@/lib/time";

type ScheduleCalendarProps = {
  className?: string;
  selectedSections: Section[];
};

export default function ScheduleCalendar({
  className,
  selectedSections,
}: ScheduleCalendarProps) {
  const times = [
    "8 AM",
    "9 AM",
    "10 AM",
    "11 AM",
    "12 PM",
    "1 PM",
    "2 PM",
    "3 PM",
    "4 PM",
    "5 PM",
    "6 PM",
    "7 PM",
  ];

  const days = [
    { label: "Mon", code: "Mo" },
    { label: "Tue", code: "Tu" },
    { label: "Wed", code: "We" },
    { label: "Thu", code: "Th" },
    { label: "Fri", code: "Fr" },
  ];
  const START_HOUR = 8;
  const PIXELS_PER_HOUR = 74;

  function getMeetingStyle(startTime: string, endTime: string) {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    const calendarStart = START_HOUR * 60;

    return {
      top: ((start - calendarStart) / 60) * PIXELS_PER_HOUR,
      height: ((end - start) / 60) * PIXELS_PER_HOUR,
    };
  }

  function getDayEvents(
    dayCode: string,
    sections: Section[],
  ): PositionedEvent[] {
    const events = sections
      .flatMap((section) =>
        section.meetings.flatMap((meeting, meetingIndex) => {
          if (
            !meeting.days.includes(dayCode) ||
            !meeting.start_time ||
            !meeting.end_time
          ) {
            return [];
          }

          return [
            {
              section,
              meeting,
              meetingIndex,
              start: timeToMinutes(meeting.start_time),
              end: timeToMinutes(meeting.end_time),
              lane: 0,
              laneCount: 1,
            },
          ];
        }),
      )
      .sort((a, b) => a.start - b.start || a.end - b.end);

    const groups: PositionedEvent[][] = [];
    let currentGroup: PositionedEvent[] = [];
    let groupEnd = -Infinity;

    for (const event of events) {
      if (currentGroup.length > 0 && event.start >= groupEnd) {
        groups.push(currentGroup);
        currentGroup = [];
        groupEnd = -Infinity;
      }

      currentGroup.push(event);
      groupEnd = Math.max(groupEnd, event.end);
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups.flatMap((group) => {
      for (const [index, event] of group.entries()) {
        event.lane = index;
        event.laneCount = group.length;
      }
      return group;
    });
  }

  return (
    <div
      className={`w-full overflow-auto rounded-sm border border-line bg-surface ${className ?? ""}`}
    >
      <div className="min-w-[800px]">
        <div className="sticky top-0 z-10 grid grid-cols-[56px_repeat(5,1fr)] bg-surface">
          <div className="border-b border-line" />
          {days.map((day) => (
            <div
              key={day.code}
              className="border-b border-line px-2 py-3 text-center text-xs font-medium text-muted"
            >
              {day.label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[56px_repeat(5,1fr)]">
          <div>
            {times.map((time) => (
              <div
                key={time}
                className="relative text-[11px] text-muted"
                style={{ height: `${PIXELS_PER_HOUR}px` }}
              >
                <span className="absolute right-2 top-1">{time}</span>
              </div>
            ))}
          </div>

          {days.map((day) => (
            <div key={day.code} className="relative border-l border-line">
              {times.map((time) => (
                <div
                  key={time}
                  className="border-b border-line/60"
                  style={{ height: `${PIXELS_PER_HOUR}px` }}
                />
              ))}

              {getDayEvents(day.code, selectedSections).map((event) => {
                const { top, height } = getMeetingStyle(
                  event.meeting.start_time!,
                  event.meeting.end_time!,
                );

                const leftPercent = (event.lane / event.laneCount) * 100;
                const widthPercent = 100 / event.laneCount;

                return (
                  <div
                    key={`${event.section.class_number}-${event.meetingIndex}-${day.code}`}
                    className="group absolute"
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      left: `calc(${leftPercent}% + 2px)`,
                      width: `calc(${widthPercent}% - 4px)`,
                    }}
                  >
                    <div className="h-full overflow-hidden rounded-sm border-l-[3px] border-carolina bg-carolina-light p-1 text-ink">
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
                        {event.section.instructors[0]?.name?.trim() ||
                          "not found"}
                      </p>
                    </div>

                    <div> </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
