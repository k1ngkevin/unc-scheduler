# UNC Scheduler

A simple course search and scheduling app for UNC students. The project is
currently in early development.

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
SUPABASE_URL=your_supabase_url
SUPABASE_PRIVATE_KEY=your_supabase_private_key
```

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
