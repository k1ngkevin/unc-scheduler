# UNC Scheduler

A course search and schedule-planning app for UNC students. Students can search
for courses, choose sections, and view their weekly schedule on a calendar.

The project is currently in early development and is working toward its first
MVP.

## Current features

- Search for courses by subject and course number.
- Add and remove courses.
- Browse the available sections for a course.
- Add sections to a weekly calendar.
- Display overlapping meetings side by side.

## Roadmap

After the scheduling workflow is reliable:

1. Add a focused campus map showing the buildings for selected classes.
2. Warn about difficult transitions between consecutive classes using walking
   distance or travel time.
3. Add sharing or calendar export.
4. Add automatic schedule generation based on student preferences and real
   user feedback.

## Tech stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase

## Getting started

Install the dependencies:

```bash
npm install
```

Create a `.env.local` file and add Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_PROJECT_ID=your_supabase_project_id
```

The course-data storage bucket must be publicly readable. Do not expose a
Supabase private key to the browser.

Start the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Available scripts

- `npm run dev` starts the development server.
- `npm run build` creates a production build.
- `npm run start` serves the production build.
- `npm run lint` runs ESLint.

## License

[MIT License](LICENSE).
