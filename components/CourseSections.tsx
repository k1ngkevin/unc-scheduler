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
  return (
    <div className="mt-1 grid divide-y divide-line rounded-sm border border-line">
      {sections.map((section) => {
        const selected = selectedSections.some(
          (item) => item.class_number === section.class_number,
        );

        return (
          <button
            type="button"
            key={section.class_number}
            aria-pressed={selected}
            className={`rounded-sm border-l-2 px-3 py-2.5 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carolina focus-visible:ring-inset ${
              selected
                ? "border-carolina bg-carolina-light"
                : "border-transparent bg-surface hover:bg-surface-muted"
            }`}
            onClick={() =>
              selected ? removeSection(section) : selectSection(section)
            }
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-ink">
                Section {section.section}
                {section.component === "REC" ? " (Recitation)" : ""}
              </p>
              {selected ? (
                <XMarkIcon aria-hidden="true" className="size-4 shrink-0 text-carolina-strong" />
              ) : (
                <PlusIcon aria-hidden="true" className="size-4 shrink-0 text-muted" />
              )}
            </div>
            <div className="mt-1 flex flex-col gap-0.5 text-[11px] leading-relaxed text-muted">
              <p>{section.available_seats} seats available</p>
              {section.meetings.map((meeting) => (
                <p key={`${meeting.start_time}-${meeting.end_time}-${meeting.room}`}>
                  {meeting.days.join(", ")}{" "}
                  {meeting.start_time && meeting.end_time
                    ? `${to12Hour(meeting.start_time)}–${to12Hour(meeting.end_time)}`
                    : "TBA"}
                </p>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
