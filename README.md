# UNC Scheduler

A course search and schedule-planning app for UNC-Chapel Hill students, with a
weekly calendar and campus map in one app.

The goal is to make class planning less repetitive: find courses, compare
sections, and check when and where classes meet without repeatedly searching
across separate tools.

## Current features

- Search for courses by subject and course number.
- Add and remove courses.
- Compare section meeting times and snapshot seat counts.
- Select sections by component, such as a lecture and a recitation.
- View selected meetings on a weekly calendar, with overlaps side by side.
- Inspect calendar details, including instructors, locations, and credits.
- Switch to a campus map showing buildings for selected classes.
- Save selected courses and sections in the current browser using localStorage.

## Roadmap

After the reliability pass, test with UNC students building real schedules,
including recitations, section swaps, and campus location checks. Use task time,
repeated searches, and mistakes to decide what to improve next.

Potential follow-up features:

1. Show instructor and building details while comparing sections.
2. Flag difficult transitions between consecutive classes using walking
   distance or travel time.
3. Add sharing or calendar export.
4. Explore automatic schedule generation if student feedback supports it.

## Tech stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase Storage for course and building snapshots
- Leaflet and React Leaflet, with OpenStreetMap tiles

## Getting started

Use Node.js 20.9 or later and npm.

Install the dependencies:

```bash
npm install
```

Create a `.env.local` file with your Supabase project ID:

```env
NEXT_PUBLIC_SUPABASE_PROJECT_ID=your_supabase_project_id
```

The `course-data` storage bucket must be publicly readable and contain:

- `scraped_data/2272.json`: an array of course sections.
- `scraped_data/building_code_coords.json`: building coordinates keyed by
  building code, with `name`, `lat`, and `long` fields.

The app currently loads the hardcoded term `2272` (spring 2027). The data URLs are defined in
[components/Scheduler.tsx](components/Scheduler.tsx), and the expected data shapes
are in [lib/types.ts](lib/types.ts). Do not expose a Supabase private key to the
browser.

Start the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Development commands

| Command            | Purpose                       |
| ------------------ | ----------------------------- |
| `npm run dev`      | Start the development server. |
| `npm run build`    | Create a production build.    |
| `npm run start`    | Serve the production build.   |
| `npm run lint`     | Run ESLint.                   |
| `npx tsc --noEmit` | Check TypeScript types.       |

`npm run build -- --webpack` is an alternative build command when troubleshooting
Turbopack issues. The app uses `next/font/google`, so builds need access to Google
Fonts.

## License

[MIT License](LICENSE).
