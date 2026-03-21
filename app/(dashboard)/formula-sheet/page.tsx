import { redirect } from "next/navigation";
import { mergeHrefWithSearch } from "@/lib/hubs";

export default function FormulaSheetRoute({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  redirect(mergeHrefWithSearch("/dashboard/revise?tool=formula-sheet", searchParams));
}
