import { redirect } from "next/navigation";
import { mergeHrefWithSearch } from "@/lib/hubs";

export default function QuizStartPage({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  redirect(mergeHrefWithSearch("/dashboard/test?tool=quiz", searchParams));
}
