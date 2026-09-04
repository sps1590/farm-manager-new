import { Wheat } from "lucide-react";

export default function Logo({
  size = "md",
  withLabel,
  label,
}: {
  size?: "sm" | "md";
  withLabel?: boolean;
  label?: string;
}) {
  const badge = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const icon = size === "sm" ? 16 : 20;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex ${badge} shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm`}
      >
        <Wheat size={icon} strokeWidth={2.25} />
      </div>
      {withLabel && (
        <span className="text-lg font-bold tracking-tight text-foreground">
          {label}
        </span>
      )}
    </div>
  );
}
