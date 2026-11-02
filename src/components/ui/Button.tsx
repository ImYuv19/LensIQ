import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D71920]/60 disabled:opacity-50 disabled:pointer-events-none select-none rounded-lg active:scale-[0.98]';

    const variants = {
      primary: 'bg-[#D71920] text-white hover:bg-[#BF141A] active:bg-[#9E0F14] shadow-sm font-semibold',
      secondary: 'bg-[#181B1F] text-[#F3F4F6] hover:bg-[#23272F] border border-[#23272F] hover:border-[#353B47]',
      outline: 'bg-transparent text-[#F3F4F6] border border-[#23272F] hover:bg-[#181B1F] hover:border-[#353B47]',
      ghost: 'bg-transparent text-[#8E95A2] hover:text-[#F3F4F6] hover:bg-[#181B1F]',
      danger: 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40',
    };

    const sizes = {
      sm: 'text-xs px-2.5 py-1.5 h-8 gap-1.5',
      md: 'text-sm px-3.5 py-2 h-9 gap-2',
      lg: 'text-sm px-5 py-2.5 h-11 gap-2.5',
      icon: 'h-9 w-9 p-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

