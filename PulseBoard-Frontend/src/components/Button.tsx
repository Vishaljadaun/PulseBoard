import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-[#c4c0ff] text-[#171430] hover:bg-[#d4d1ff] border border-transparent shadow-sm',
  secondary: 'bg-surface-raised text-paper border border-border-soft',
  danger: 'bg-pulse-magenta/10 text-pulse-magenta border border-pulse-magenta/30 hover:bg-pulse-magenta/20',
  ghost: 'bg-transparent text-muted hover:text-paper',
};

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode;
  variant?: Variant;
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.15 }}
      disabled={disabled}
      className={`focus-ring inline-flex min-h-11 items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:pointer-events-none ${
        VARIANT_CLASSES[variant]
      } ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
