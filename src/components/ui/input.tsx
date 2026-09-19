import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-[3px] border border-line bg-paper-raised px-3 text-sm text-ink placeholder:text-ink-mute focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
