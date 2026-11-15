import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "default" | "sm";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          "rounded-control",
          size === "default" && "h-12 px-6 text-[15px]",
          size === "sm" && "h-10 px-4 text-[14px]",
          variant === "primary" && "bg-coral-600 text-white hover:bg-danger-700",
          variant === "secondary" && "bg-white text-ink-900 border border-line-200 hover:bg-paper-50",
          variant === "ghost" && "bg-transparent text-ink-900 hover:bg-paper-50",
          variant === "danger" && "bg-danger-700 text-white hover:opacity-90",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
export { Button };
