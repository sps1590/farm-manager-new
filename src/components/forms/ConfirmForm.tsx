"use client";

export default function ConfirmForm({
  action,
  hiddenFields,
  confirmMessage,
  children,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hiddenFields: Record<string, string | number>;
  confirmMessage: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      {Object.entries(hiddenFields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      {children}
    </form>
  );
}
