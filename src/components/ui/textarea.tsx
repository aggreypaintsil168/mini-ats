import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-[3px] border border-line bg-paper-raised px-3 py-2 text-sm text-ink placeholder:text-ink-mute focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
