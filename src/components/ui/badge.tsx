import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-black/[0.04] text-ink-mute",
  signal: "bg-signal-soft text-signal",
  flag: "bg-flag-soft text-flag",
  amber: "bg-amber-soft text-amber",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: keyof typeof tones;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("inline-flex items-center rounded-[3px] px-1.5 py-0.5 text-[11px] font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}
