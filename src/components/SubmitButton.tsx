"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({
  children,
  className = "btn-primary",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-60`}>
      {pending ? "…" : children}
    </button>
  );
}
