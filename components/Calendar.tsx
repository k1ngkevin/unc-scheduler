import { Section } from "@/lib/types";
import { to12Hour } from "@/lib/time";

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
  const PIXELS_PER_HOUR = 72;

  function timeToMinutes(time: string) {
    const [hours, minutes] = time.split(":", 2);
    return Number(hours) * 60 + Number(minutes);
  }

  function getMeetingStyle(startTime: string, endTime: string) {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    const calendarStart = START_HOUR * 60;

    return {
      top: ((start - calendarStart) / 60) * PIXELS_PER_HOUR,
      height: ((end - start) / 60) * PIXELS_PER_HOUR,
    };
  }

  return (
    <div className={`w-full overflow-auto ${className ?? ""}`}>
      <div className="min-w-[800px]">
        <div className="grid grid-cols-[70px_repeat(5,1fr)]">
          <div />
          {days.map((day) => (
            <div
              key={day.code}
              className="border-b border-zinc-700 p-3 text-center font-semibold"
            >
              {day.label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[70px_repeat(5,1fr)]">
          <div>
            {times.map((time) => (
              <div
                key={time}
                className="relative text-sm text-zinc-400"
                style={{ height: `${PIXELS_PER_HOUR}px` }}
              >
                <span className="absolute right-2 top-0 -translate-y-1/2">
                  {time}
                </span>
              </div>
            ))}
          </div>

          {days.map((day) => (
            <div
              key={day.code}
              className="relative border-l border-zinc-700 last:border-r"
            >
              {times.map((time) => (
                <div
                  key={time}
                  className="border-b border-zinc-700"
                  style={{ height: `${PIXELS_PER_HOUR}px` }}
                />
              ))}

              {selectedSections.flatMap((section) =>
                section.meetings.flatMap((meeting, idx) => {
                  if (
                    !meeting.start_time ||
                    !meeting.end_time ||
                    !meeting.days.includes(day.code)
                  ) {
                    return [];
                  }

                  const { top, height } = getMeetingStyle(
                    meeting.start_time,
                    meeting.end_time,
                  );

                  return (
                    <div
                      key={`${section.class_number}-${idx}-${day.code}`}
                      className="absolute inset-x-1 rounded bg-pink-500"
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                      }}
                    >
                      <h3 className="text-xs">
                        {section.subject} {section.course_number}
                      </h3>
                      <p className="text-xs">
                        {meeting.building} {meeting.room}
                      </p>
                      <p className="text-xs">
                        {meeting.start_time && meeting.end_time
                          ? `${to12Hour(meeting.start_time)}–${to12Hour(meeting.end_time)}`
                          : "TBA"}
                      </p>
                      <p className="text-xs">{section?.instructors[0].name}</p>
                    </div>
                  );
                }),
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
