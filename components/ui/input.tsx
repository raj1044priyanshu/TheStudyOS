import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "flex min-h-11 w-full rounded-xl border border-[color:var(--outline-variant)] bg-[color:var(--control-bg)] px-4 py-2.5 text-sm text-[var(--foreground)] shadow-[var(--field-shadow)] placeholder:text-[var(--tertiary-foreground)] focus-visible:border-[color:var(--ring)] focus-visible:bg-[color:var(--control-hover-bg)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--ring-soft)]",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
