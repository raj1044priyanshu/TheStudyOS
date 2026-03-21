import { redirect } from "next/navigation";
import { mergeHrefWithSearch } from "@/lib/hubs";

export default function EvaluatorRoute({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  redirect(mergeHrefWithSearch("/dashboard/test?tool=evaluator", searchParams));
}
