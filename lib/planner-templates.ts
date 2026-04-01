import { normalizeTopicList } from "@/lib/planner-utils";
import type { StudyStream } from "@/types";

export const STREAM_TEMPLATE_SUBJECTS: Record<Exclude<StudyStream, "Other">, string[]> = {
  Science: ["English", "Physics", "Chemistry", "Mathematics", "Biology", "Computer Science"],
  Commerce: ["English", "Accountancy", "Business Studies", "Economics", "Mathematics"],
  Humanities: ["English", "History", "Geography", "Political Science", "Economics", "Psychology", "Sociology"]
};

export function resolvePlannerTemplateSubjects({
  stream,
  profileSubjects = []
}: {
  stream?: StudyStream | "";
  profileSubjects?: string[];
}) {
  if (stream && stream !== "Other") {
    return [...STREAM_TEMPLATE_SUBJECTS[stream]];
  }

  return normalizeTopicList(profileSubjects);
}
