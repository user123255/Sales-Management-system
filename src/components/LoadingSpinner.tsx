
// Local utility: combine class names (simple fallback for missing '@/lib/utils')
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

const sizes = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' };

export function LoadingSpinner({ size = 'md', message, className }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-4 border-primary-200 border-t-primary-600',
          sizes[size]
        )}
      />
      {message && <p className="mt-3 text-sm text-text-muted">{message}</p>}
    </div>
  );
}
