export const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Geography",
  "English",
  "Computer Science",
  "Economics",
  "Other"
] as const;

export const CLASS_OPTIONS = [
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
  "Undergraduate",
  "Competitive Exam"
] as const;

export const SUBJECT_COLOR_VALUES: Record<string, string> = {
  Mathematics: "#818CF8",
  Physics: "#38BDF8",
  Chemistry: "#34D399",
  Biology: "#86EFAC",
  History: "#FCD34D",
  Geography: "#6EE7B7",
  English: "#F9A8D4",
  "Computer Science": "#A78BFA",
  Economics: "#FCA5A5",
  Other: "#C4B5FD"
};

export const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "bg-[#818CF8]/18 text-[#4F46E5] dark:text-[#C7D2FE]",
  Physics: "bg-[#38BDF8]/18 text-[#0C6A93] dark:text-[#BAE6FD]",
  Chemistry: "bg-[#34D399]/18 text-[#0F766E] dark:text-[#A7F3D0]",
  Biology: "bg-[#86EFAC]/22 text-[#2F855A] dark:text-[#DCFCE7]",
  History: "bg-[#FCD34D]/22 text-[#A16207] dark:text-[#FDE68A]",
  Geography: "bg-[#6EE7B7]/20 text-[#0F766E] dark:text-[#CCFBF1]",
  English: "bg-[#F9A8D4]/18 text-[#BE185D] dark:text-[#FBCFE8]",
  "Computer Science": "bg-[#A78BFA]/20 text-[#6D28D9] dark:text-[#DDD6FE]",
  Economics: "bg-[#FCA5A5]/20 text-[#B91C1C] dark:text-[#FECACA]",
  Other: "bg-[#C4B5FD]/20 text-[#6D5BD0] dark:text-[#E9E3FF]"
};
