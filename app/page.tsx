import Scheduler from "@/components/Scheduler";

export default function Home() {
  return (
    <div className="flex flex-1 justify-center font-sans">
      <main className="flex w-full max-w-3xl flex-col gap-10 px-6 py-20 sm:px-10 sm:py-28">
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
