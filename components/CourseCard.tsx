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
    <div>
      <h2>
        {subject} {number}
      </h2>
      <p>{name}</p>
    </div>
  );
}
