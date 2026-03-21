import Image from "next/image";
import { cn } from "@/lib/utils";

interface Props {
  src?: string | null;
  alt: string;
  className?: string;
}

export function Avatar({ src, alt, className }: Props) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={40}
        height={40}
        className={cn("h-10 w-10 rounded-full border border-[color:var(--panel-border)] object-cover shadow-[var(--icon-shadow)]", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--panel-border)] bg-[color:var(--primary)] text-sm font-medium text-[color:var(--primary-foreground)] shadow-[var(--primary-shadow)]",
        className
      )}
    >
      {alt[0]?.toUpperCase()}
    </div>
  );
}
