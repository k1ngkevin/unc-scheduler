import { Section } from "@/lib/types";
type CourseSectionsProps = {
  sections: Section[];
};

export default function CourseSections({ sections }: CourseSectionsProps) {
  return (
    <div className="mt-2 grid gap-2 pl-4">
      {sections.map((section) => (
        <button
          type="button"
          key={section.class_number}
          className="rounded-lg border border-white/10 bg-zinc-900 p-3 text-left"
        >
          <p className="font-medium text-white">Section {section.section}</p>

          <p className="text-sm text-zinc-400">
            {section.available_seats} seats available
          </p>
        </button>
      ))}
    </div>
  );
}
