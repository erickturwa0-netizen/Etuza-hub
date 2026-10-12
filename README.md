# ETUZA HUB

Premium bilingual (Swahili + English) platform for Movies, Android Games and VPN configurations.

**Stack:** Next.js 15 • TypeScript • Tailwind • Supabase • Lucide

## Features

- Movies with TMDB automatic covers + stream/download
- Android Games with automatic covers
- VPN configs with brand logos + Copy button
- Secure Admin panel (role-based)
- Simple recommendations
- Fully responsive dark premium UI

## Setup

### 1. Supabase

1. Create a project at https://supabase.com
2. Go to SQL Editor and run the file `supabase/migrations/001_initial_schema.sql`
3. In Authentication → Providers enable Email
4. Copy Project URL and anon key + service_role key

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TMDB_API_KEY=
```

Get TMDB key free at https://www.themoviedb.org/settings/api

### 3. First Admin

After first signup, go to Supabase → Table Editor → `profiles` and change the `role` of your user to `admin`.

### 4. Run locally

```bash
npm install
npm run dev
```

### 5. Deploy to Vercel

1. Push this repo to GitHub
2. Import the repo in Vercel (new project)
3. Add the same environment variables
4. Deploy

## Admin Panel

Visit `/admin` after logging in as admin.

## License

Private – owned by the repository owner.
