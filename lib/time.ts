export function to12Hour(time: string): string {
  const [hourString, minutes] = time.split(":");

  const hour = Number(hourString);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  return `${hour12}:${minutes} ${period}`;
}
