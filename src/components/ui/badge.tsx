import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "danger";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold transition-colors",
        variant === "default" && "bg-line-200 text-ink-900",
        variant === "secondary" && "border border-line-200 bg-paper-50 text-muted-600",
        variant === "success" && "bg-success-700/10 text-success-700",
        variant === "warning" && "bg-warning-700/10 text-warning-700",
        variant === "danger" && "bg-danger-700/10 text-danger-700",
        className
      )}
      {...props}
    />
  );
}
export { Badge };
