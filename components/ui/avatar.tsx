import Image from "next/image";

interface Props {
  src?: string | null;
  alt: string;
}

export function Avatar({ src, alt }: Props) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={40}
        height={40}
        className="h-10 w-10 rounded-full border border-[color:var(--panel-border)] object-cover shadow-[var(--icon-shadow)]"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--panel-border)] bg-[color:var(--primary)] text-sm font-medium text-[color:var(--primary-foreground)] shadow-[var(--primary-shadow)]">
      {alt[0]?.toUpperCase()}
    </div>
  );
}
