import rawGuides from "@/content/study-guides/generated-guides.json";
import type { FaqItem } from "@/lib/structured-data";

interface StudyGuideSection {
  heading: string;
  content: string;
}

interface StudyGuideSource {
  label: string;
  note: string;
}

export interface StudyGuide {
  subject: string;
  topic: string;
  title: string;
  description: string;
  intro: string;
  keyTakeaways: string[];
  sections: StudyGuideSection[];
  faqs: FaqItem[];
  practiceChecklist: string[];
  approvedSources: StudyGuideSource[];
  indexable: boolean;
  subjectSlug: string;
  topicSlug: string;
  path: string;
}

const STUDY_GUIDES = rawGuides as StudyGuide[];

export function getStudyGuides() {
  return STUDY_GUIDES;
}

export function getStudyGuide(subjectSlug: string, topicSlug: string) {
  return STUDY_GUIDES.find((guide) => guide.subjectSlug === subjectSlug && guide.topicSlug === topicSlug) ?? null;
}

export function getIndexableStudyGuides() {
  return STUDY_GUIDES.filter((guide) => guide.indexable);
}
