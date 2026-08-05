import type { InputHTMLAttributes } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function FormField({ label, className = '', ...props }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-muted mb-1.5">{label}</label>
      <input
        className={`focus-ring w-full bg-ink/60 border border-border-soft rounded-xl px-3.5 py-2.5 text-sm text-paper placeholder:text-muted/60 focus:border-pulse-violet transition-colors ${className}`}
        {...props}
      />
    </div>
  );
}
