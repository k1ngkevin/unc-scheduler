import {
  PlusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import { Course } from "@/lib/types";

type CourseCardVariant = "selected" | "notSelected";

type CourseCardProps = {
  subject: string;
  number: string;
  title: string;
  variant: CourseCardVariant;
  expanded?: boolean;
  removeCourse?: () => void;
  onClick?: () => void;
};

export default function CourseCard({
  subject,
  number,
  title,
  variant,
  expanded,
  removeCourse,
  onClick,
}: CourseCardProps) {
  function getIcons(cardVariant: CourseCardVariant) {
    switch (cardVariant) {
      case "selected":
        return (
          <div className="flex gap-3">
            {expanded ? (
              <ChevronUpIcon className="size-5" />
            ) : (
              <ChevronDownIcon className="size-5" />
            )}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                removeCourse?.();
              }}
            >
              <TrashIcon className="size-5" />
            </button>
          </div>
        );
      case "notSelected":
        return <PlusIcon className="size-5" />;
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left rounded-xl border border-white/10 bg-zinc-800 p-5 shadow-md shadow-black/10 transition hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-700 hover:shadow-lg hover:shadow-black/20"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-sm font-semibold tracking-wide text-zinc-300">
          {subject} {number}
        </h2>
        {getIcons(variant)}
      </div>

      <p className="mt-2 text-base font-medium leading-snug text-white">
        {title}
      </p>
    </button>
  );
}
