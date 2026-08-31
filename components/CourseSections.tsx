import { Section } from "@/lib/types";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { to12Hour } from "@/lib/time";

type CourseSectionsProps = {
  sections: Section[];
  selectedSections: Section[];
  selectSection: (section: Section) => void;
  removeSection: (section: Section) => void;
};

export default function CourseSections({
  sections,
  selectedSections,
  selectSection,
  removeSection,
}: CourseSectionsProps) {
  function isSectionSelected(section: Section): Boolean {
    return selectedSections.some(
      (selected) => selected.class_number === section.class_number,
    );
  }

  function getSectionStyle(section: Section) {
    if (isSectionSelected(section)) {
      return (
        <button
          type="button"
          key={section.class_number}
          className="rounded-lg border p-3 text-left border-blue-400 bg-blue-500/20"
          onClick={() => removeSection(section)}
        >
          <div className="flex justify-between">
            <p className="font-medium text-white">Section {section.section}</p>
            <XMarkIcon className="size-5" />
          </div>
          <div className="flex justify-between">
            <p className="text-sm text-zinc-400">
              {section.available_seats} seats available
            </p>
            {section.meetings.map((meeting) => (
              <p
                className="text-sm text-zinc-400"
                key={`${meeting.start_time}-${meeting.end_time}-${meeting.room}`}
              >
                {meeting.days.join(", ")}{" "}
                {meeting.start_time && meeting.end_time
                  ? `${to12Hour(meeting.start_time)}–${to12Hour(meeting.end_time)}`
                  : "TBA"}
              </p>
            ))}
          </div>
        </button>
      );
    } else {
      return (
        <button
          type="button"
          key={section.class_number}
          className="rounded-lg border p-3 text-left border-white/10 bg-zinc-900 hover:bg-zinc-800"
          onClick={() => selectSection(section)}
        >
          <div className="flex justify-between">
            <p className="font-medium text-white">Section {section.section}</p>
            <PlusIcon className="size-5" />
          </div>
          <div className="flex justify-between">
            <p className="text-sm text-zinc-400">
              {section.available_seats} seats available
            </p>
            {section.meetings.map((meeting) => (
              <p
                className="text-sm text-zinc-400"
                key={`${meeting.start_time}-${meeting.end_time}-${meeting.room}`}
              >
                {meeting.days.join(", ")}{" "}
                {meeting.start_time && meeting.end_time
                  ? `${to12Hour(meeting.start_time)}–${to12Hour(meeting.end_time)}`
                  : "TBA"}
              </p>
            ))}
          </div>
        </button>
      );
    }
  }

  return (
    <div className="mt-2 grid gap-2 pl-4">
      {sections.map((section) => getSectionStyle(section))}
    </div>
  );
}
