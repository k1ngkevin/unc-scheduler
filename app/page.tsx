import Scheduler from "@/components/Scheduler";

export default function Home() {
  return (
    <div className="flex justify-center font-sans">
      <main className="flex w-full flex-col px-6 py-8 sm:px-10 sm:py-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            UNC Scheduler
          </h1>
          <Scheduler />
        </div>
      </main>
    </div>
  );
}
