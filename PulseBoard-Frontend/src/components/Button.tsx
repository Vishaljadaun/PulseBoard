import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-pulse-violet to-pulse-magenta text-white shadow-lg shadow-pulse-violet/25',
  secondary: 'bg-surface-raised text-paper border border-border-soft',
  danger: 'bg-surface-raised text-paper border border-border-soft hover:border-pulse-magenta/50',
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
      className={`focus-ring font-medium px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:pointer-events-none ${
        VARIANT_CLASSES[variant]
      } ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
