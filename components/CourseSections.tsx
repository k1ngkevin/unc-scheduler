import { Section } from "@/lib/types";
type CourseSectionsProps = {
  sections: Section[];
};

export default function CourseSections({ sections }: CourseSectionsProps) {
  function to12Hour(time: string): string {
    const [hourString, minutes] = time.split(":");

    const hour = Number(hourString);
    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;

    return `${hour12}:${minutes} ${period}`;
  }

  return (
    <div className="mt-2 grid gap-2 pl-4">
      {sections.map((section) => (
        <button
          type="button"
          key={section.class_number}
          className="rounded-lg border border-white/10 bg-zinc-900 p-3 text-left"
        >
          <p className="font-medium text-white">Section {section.section}</p>
          <div className="flex justify-between">
            <p className="text-sm text-zinc-400">
              {section.available_seats} seats available
            </p>
            {section.meetings.map((meeting) => (
              <p className="text-sm text-zinc-400">
                {meeting.days.join(", ")}{" "}
                {meeting.start_time && meeting.end_time
                  ? `${to12Hour(meeting.start_time)}–${to12Hour(meeting.end_time)}`
                  : "TBA"}
              </p>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}
