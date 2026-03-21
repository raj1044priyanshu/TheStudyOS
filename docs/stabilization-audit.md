# StudyOS Stabilization Audit

## Baseline
- Status: in progress
- Goal: stabilize the current branch without reverting unrelated user work
- Verification gate: `npm run verify:clean`

## Structural fixes completed
- Canonicalized the sign-in route to an explicit `/login` page instead of relying on a grouped auth path.
- Cleaned the verification pipeline so `typecheck` and `build` run from a fresh output state.
- Marked known user-specific API routes as `force-dynamic` where build-time analysis was surfacing implicit dynamic usage.
- Suppressed the `ScanResult` reserved-key warning at the schema level to keep build output focused on real failures.

## Current verification status
- `npm run lint`: passing
- `npm run typecheck`: passing from a clean state
- `npm run build`: passing from a clean state
- `npm run smoke:routes`: expected after a successful build

## Route audit status
- Reviewed and build-covered
  - Root shell: `/`, `/login`, `/onboarding`, `/suspended`, `/welcome`
  - Admin pages: `/admin`, `/admin/audit`, `/admin/errors`, `/admin/feedback`, `/admin/ops`, `/admin/resources`, `/admin/settings`, `/admin/users`
  - Canonical dashboard hub routes: `/dashboard`, `/dashboard/plan`, `/dashboard/study`, `/dashboard/test`, `/dashboard/revise`, `/dashboard/track`, `/dashboard/profile`, `/dashboard/study-room`, `/dashboard/knowledge-graph`, `/dashboard/mindmap`, `/dashboard/notes/[id]`, `/dashboard/quiz/[id]`, `/dashboard/quiz/[id]/autopsy`
  - Legacy redirect surfaces: `/notes`, `/quiz`, `/planner`, `/revision`, `/study-room`, `/profile`, `/knowledge-graph`, `/mindmap`, `/progress`, `/videos`, `/focus`, `/flashcards`, `/exams`, `/teach-me`, `/scanner`, `/doubts`, `/evaluator`, `/past-papers`
- Reviewed and build-covered APIs
  - Auth, admin control-plane, dashboard, feedback, errors, notes, planner, profile, progress, quiz, scanner, search, videos

## Still queued for deeper subsystem review
- Scanner data model cleanup beyond warning suppression
- Runtime behavior validation for external integrations: email, Gemini/Groq/YouTube, Cloudinary, Redis, Pusher
- Feature-level manual flows for notes, planner, quiz, revision, scanner, evaluator, focus room, study room, and admin mutations
- Data-level review for legacy documents against newer schemas

## Known warnings to watch
- Dynamic server usage is expected on authenticated or header-dependent API routes that are explicitly marked dynamic.
- Full feature QA is still broader than build-time validation; this ledger should be extended as subsystem passes complete.
