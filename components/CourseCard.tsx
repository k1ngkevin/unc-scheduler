import {
  PlusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";

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
  return (
    <div className="flex items-start rounded-sm border border-line bg-surface">
      <button
        type="button"
        onClick={onClick}
        aria-expanded={variant === "selected" ? expanded : undefined}
        aria-label={
          variant === "notSelected" ? `Add ${subject} ${number}: ${title}` : undefined
        }
        className="min-w-0 flex-1 rounded-sm p-3 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carolina focus-visible:ring-inset"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">
            {subject} {number}
          </h2>
          {variant === "notSelected" ? (
            <PlusIcon aria-hidden="true" className="size-4 shrink-0 text-carolina-strong" />
          ) : expanded ? (
            <ChevronUpIcon aria-hidden="true" className="size-4 shrink-0 text-muted" />
          ) : (
            <ChevronDownIcon aria-hidden="true" className="size-4 shrink-0 text-muted" />
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted">{title}</p>
      </button>
      {variant === "selected" && (
        <button
          type="button"
          onClick={removeCourse}
          aria-label={`Remove ${subject} ${number}`}
          className="mr-1 mt-1 rounded-sm p-2 text-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carolina"
        >
          <TrashIcon aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  );
}
