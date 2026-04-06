import Link from "next/link";
import type { MDXComponents } from "mdx/types";
import { cn } from "@/lib/utils";

export const mdxComponents: MDXComponents = {
  h1: ({ className, ...props }) => <h1 className={cn("font-headline text-5xl tracking-[-0.04em] text-[var(--foreground)]", className)} {...props} />,
  h2: ({ className, ...props }) => <h2 className={cn("mt-10 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]", className)} {...props} />,
  h3: ({ className, ...props }) => <h3 className={cn("mt-8 text-xl font-semibold text-[var(--foreground)]", className)} {...props} />,
  p: ({ className, ...props }) => <p className={cn("mt-4 text-base leading-8 text-[var(--muted-foreground)]", className)} {...props} />,
  ul: ({ className, ...props }) => <ul className={cn("mt-4 list-disc space-y-2 pl-6 text-[var(--muted-foreground)]", className)} {...props} />,
  ol: ({ className, ...props }) => <ol className={cn("mt-4 list-decimal space-y-2 pl-6 text-[var(--muted-foreground)]", className)} {...props} />,
  li: ({ className, ...props }) => <li className={cn("pl-1 leading-7", className)} {...props} />,
  strong: ({ className, ...props }) => <strong className={cn("font-semibold text-[var(--foreground)]", className)} {...props} />,
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn("mt-6 rounded-[22px] border border-[color:var(--panel-border)] bg-[color:var(--surface-panel)] px-5 py-4 text-[var(--foreground)]", className)}
      {...props}
    />
  ),
  code: ({ className, ...props }) => <code className={cn("rounded bg-[color:var(--surface-low)] px-1.5 py-0.5 text-sm text-[var(--foreground)]", className)} {...props} />,
  pre: ({ className, ...props }) => (
    <pre
      className={cn("mt-6 overflow-x-auto rounded-[22px] border border-[color:var(--panel-border)] bg-[color:var(--background-strong)] p-5 text-sm text-[var(--foreground)]", className)}
      {...props}
    />
  ),
  a: ({ className, href = "", ...props }) => {
    if (href.startsWith("/")) {
      return <Link href={href} className={cn("font-medium text-[#7B6CF6] underline-offset-4 hover:underline", className)} {...props} />;
    }

    return <a href={href} className={cn("font-medium text-[#7B6CF6] underline-offset-4 hover:underline", className)} rel="noreferrer" target="_blank" {...props} />;
  }
};
