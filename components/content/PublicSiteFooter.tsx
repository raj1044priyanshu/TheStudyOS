import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/resources", label: "Resources" },
  { href: "/blog", label: "Blog" },
  { href: "/study-guides", label: "Study Guides" }
];

export function PublicSiteFooter() {
  return (
    <footer className="border-t border-[color:var(--panel-border)] py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 text-sm text-[var(--muted-foreground)] sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <p className="max-w-xl">StudyOS helps students move from planning to learning to revision in one calm workflow.</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-[var(--foreground)]">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
