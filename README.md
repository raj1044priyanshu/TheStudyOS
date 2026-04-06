# StudyOS

StudyOS is a focused study workspace for students who want notes, quizzes, planning, revision tools, and progress tracking in one place.

## Features

- Handwritten-style notes with clean reading and export support
- Doubt solving with short, structured explanations
- Quiz generation with scoring and review
- Study planner with day-wise task flow
- Flashcards, mind maps, and video discovery
- Progress tracking with streaks, levels, and achievements
- Welcome onboarding flow and guided product tour
- Email notifications for milestones, reminders, and weekly summaries

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- NextAuth
- MongoDB with Mongoose
- Nodemailer

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Create your local environment file

```bash
cp .env.local.example .env.local
```

3. Start the app

```bash
npm run dev
```

4. Generate the public study-guide dataset

```bash
npm run content:generate
```

## Environment Variables

Required core variables:

- `MONGODB_URI`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`

Email and notification variables:

- `APP_URL`
- `GOOGLE_SITE_VERIFICATION`
- `BING_SITE_VERIFICATION`
- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_SECURE`
- `CRON_SECRET`

Optional:

- `CONTENT_PRIMARY_API_BASE`
- `CONTENT_PRIMARY_API_KEY`
- `CONTENT_PRIMARY_TEXT_MODEL`
- `CONTENT_PRIMARY_MULTIMODAL_MODEL`
- `CONTENT_PRIMARY_IMAGE_MODEL`
- `CONTENT_FALLBACK_API_BASE`
- `CONTENT_FALLBACK_API_KEY`
- `CONTENT_FALLBACK_TEXT_MODEL`
- `YOUTUBE_API_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_DISABLE_WEBPACK_CACHE`

Study Room realtime variables:

- `PUSHER_APP_ID`
- `PUSHER_KEY`
- `PUSHER_SECRET`
- `PUSHER_CLUSTER`
- `NEXT_PUBLIC_PUSHER_KEY`
- `NEXT_PUBLIC_PUSHER_CLUSTER`

## Quality Checks

```bash
npm run lint
npm run typecheck
npm run build
npm run smoke:routes
```

If onboarding routes start returning `404` during local development after route changes, restart with:

```bash
npm run dev:clean
```

## Deployment

Before pushing or deploying, run the full local gate:

```bash
npm run lint
npm run typecheck
npm run build
npm run smoke:routes
```

Then verify these settings in Vercel for both Preview and Production:

- Auth: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- App URLs: `APP_URL` should match your live domain and `NEXTAUTH_URL`
- Email and cron: `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `CRON_SECRET`
- Realtime study room: `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`
- Media: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Rate limiting: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

Notes:

- First-visit theme follows the user system theme. Users can still switch themes manually afterward.
- Expanded route rate limiting works in production only when the Upstash Redis variables are set.
- If email CTA buttons should open your live site, `APP_URL` must be the public HTTPS domain.

Recommended post-deploy smoke check:

1. Sign in and confirm the dashboard loads with the expected theme.
2. Generate or open a note, then verify the handwritten paper styling and PDF export.
3. Test global search, hub navigation, and mobile navigation.
4. If enabled in your environment, test scanner upload, study room realtime sync, and admin pages.
5. Confirm scheduled jobs are present in Vercel and that protected API routes return `429` under repeated abuse instead of failing hard.

## Notes

- `vercel.json` includes scheduled cron routes for reminders and summaries.
- If `APP_URL` is missing, emails still send, but CTA buttons are omitted.
