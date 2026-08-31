import { Section, Course } from "@/lib/types";

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

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  return (
    <div className={`w-full overflow-x-auto ${className ?? ""}`}>
      <div className="min-w-[800px]">
        <div className="grid grid-cols-[70px_repeat(5,1fr)]">
          <div />
          {days.map((day) => (
            <div
              key={day}
              className="border-b border-zinc-700 p-3 text-center font-semibold"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[70px_repeat(5,1fr)]">
          <div>
            {times.map((time) => (
              <div key={time} className="relative h-16 text-sm text-zinc-400">
                <span className="absolute right-2 top-0 -translate-y-1/2">
                  {time}
                </span>
              </div>
            ))}
          </div>

          {days.map((day) => (
            <div
              key={day}
              className="relative border-l border-zinc-700 last:border-r"
            >
              {times.map((time) => (
                <div key={time} className="h-16 border-b border-zinc-700" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
