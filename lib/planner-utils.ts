export function normalizeTopicList(rawTopics: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const topic of rawTopics) {
    const nextTopic = topic.trim().replace(/\s+/g, " ");
    if (!nextTopic) {
      continue;
    }

    const key = nextTopic.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(nextTopic);
  }

  return normalized.slice(0, 48);
}

export function toDateInput(value: string | Date | null | undefined) {
  if (!value) {
    return "";
  }

  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.valueOf())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function buildPlannerAssessmentHref(checkpointId: string) {
  return `/dashboard/plan/assessment/${checkpointId}`;
}
