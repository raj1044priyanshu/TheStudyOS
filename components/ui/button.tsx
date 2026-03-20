"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[color:var(--primary)] text-[color:var(--primary-foreground)] shadow-[var(--primary-shadow)] hover:-translate-y-px hover:shadow-[var(--primary-shadow-hover)] active:translate-y-0 active:shadow-[var(--primary-shadow)]",
        secondary:
          "border border-[color:var(--secondary-button-border)] bg-[color:var(--secondary-button-bg)] text-[color:var(--secondary-button-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-[color:var(--secondary-button-hover)]",
        outline:
          "border border-[color:var(--control-border)] bg-[color:var(--control-bg)] text-[var(--foreground)] shadow-[var(--control-shadow)] hover:bg-[color:var(--control-hover-bg)]",
        ghost: "bg-transparent text-[var(--muted-foreground)] shadow-none hover:bg-[color:var(--ghost-hover)] hover:text-[var(--foreground)]"
      },
      size: {
        default: "px-6 py-2.5",
        sm: "min-h-9 px-3.5 py-2 text-xs",
        lg: "min-h-12 px-7 py-3 text-[15px]",
        icon: "h-11 w-11 rounded-[14px] p-0"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
));
Button.displayName = "Button";

export { Button, buttonVariants };
