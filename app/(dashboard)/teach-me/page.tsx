import { redirect } from "next/navigation";
import { mergeHrefWithSearch } from "@/lib/hubs";

export default function TeachMeRoute({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  redirect(mergeHrefWithSearch("/dashboard/test?tool=teach-me", searchParams));
}
