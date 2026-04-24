import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-full px-3 py-1 text-xs font-medium', {
  variants: {
    variant: {
      default: 'bg-primary/10 text-primary',
      secondary: 'bg-secondary text-secondary-foreground',
      outline: 'border border-border bg-background/80 text-foreground',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export function Badge({ className, variant, ...props }: React.ComponentProps<'div'> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
