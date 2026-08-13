type CourseCardProps = {
  subject: string;
  number: string;
  title: string;
};

export default function CourseCard({
  subject,
  number,
  title: name,
}: CourseCardProps) {
  return (
    <article className="group rounded-xl border border-white/10 bg-zinc-800 p-5 shadow-md shadow-black/10 transition hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-700 hover:shadow-lg hover:shadow-black/20">
      <h2 className="font-mono text-sm font-semibold tracking-wide text-zinc-300">
        {subject} {number}
      </h2>
      <p className="mt-2 text-base font-medium leading-snug text-white">
        {name}
      </p>
    </article>
  );
}
