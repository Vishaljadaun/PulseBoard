import { useId, type InputHTMLAttributes } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function FormField({ label, className = '', id, ...props }: FormFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <div>
      <label htmlFor={fieldId} className="block text-sm font-medium text-paper mb-2">{label}</label>
      <input
        id={fieldId}
        className={`focus-ring w-full min-h-11 bg-ink/60 border border-border-soft rounded-xl px-3.5 py-2.5 text-sm text-paper focus:border-pulse-violet transition-colors ${className}`}
        {...props}
      />
    </div>
  );
}
