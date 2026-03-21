import { redirect } from "next/navigation";
import { mergeHrefWithSearch } from "@/lib/hubs";

export default function NotesPage({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  redirect(mergeHrefWithSearch("/dashboard/study?tool=notes", searchParams));
}
