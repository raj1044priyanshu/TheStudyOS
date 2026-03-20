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

## Environment Variables

Required core variables:

- `MONGODB_URI`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Email and notification variables:

- `APP_URL`
- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_SECURE`
- `CRON_SECRET`

Optional:

- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `YOUTUBE_API_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_DISABLE_WEBPACK_CACHE`

## Quality Checks

```bash
npm run lint
npm run typecheck
npm run build
```

## Deployment

Deploy on Vercel with the same environment variables used locally.

If email CTA buttons should open your live site, set:

```env
APP_URL=https://your-domain.com
```

## Notes

- `vercel.json` includes scheduled cron routes for reminders and summaries.
- If `APP_URL` is missing, emails still send, but CTA buttons are omitted.
