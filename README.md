# SwapSync

Hostel room swap board built with Next.js and Supabase.

## Supabase setup

1. Create a Supabase project.
2. Open the Supabase SQL editor and run `supabase/schema.sql`.
3. Copy `.env.example` to `.env.local` for local development.
4. Fill in:
   - `SUPABASE_URL`: your project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: your service role key from Supabase project settings.

The service role key is only used inside server-side API routes. Do not expose it with a `NEXT_PUBLIC_` prefix.

## Vercel deployment

Add the same environment variables in Vercel:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Then deploy normally with Vercel's Next.js preset.
