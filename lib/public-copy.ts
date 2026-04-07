export const PUBLIC_FEEDBACK_DESCRIPTION =
  "Share bugs, missing details, feature ideas, or rough edges from your experience. Every report goes straight to the StudyOS team with helpful context.";

export function sanitizePublicFeedbackDescription(description: string) {
  return /admin queue|admin dashboard/i.test(description) ? PUBLIC_FEEDBACK_DESCRIPTION : description;
}
