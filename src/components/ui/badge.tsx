import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-blue-600 to-indigo-600 text-white",
        secondary:
          "border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-2)]",
        destructive:
          "border-transparent bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/20",
        outline:
          "text-[var(--fg)] border-[var(--border)]",
        success:
          "border-transparent bg-green-100 text-green-700 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/20",
        warning:
          "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/20",
        info:
          "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/20",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
