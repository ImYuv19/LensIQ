import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'ready' | 'processing' | 'failed' | 'queued' | 'outline' | 'red';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  children,
  ...props
}) => {
  const variants = {
    default: 'bg-[#1E2228] text-[#BAC0CC] border-[#2A2F38]',
    ready: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    processing: 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse',
    failed: 'bg-red-500/10 text-red-400 border-red-500/30',
    queued: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    outline: 'bg-transparent text-[#8E95A2] border-[#23272F]',
    red: 'bg-[#D71920]/15 text-[#FF6B6B] border-[#D71920]/30',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md border tracking-wide uppercase',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

