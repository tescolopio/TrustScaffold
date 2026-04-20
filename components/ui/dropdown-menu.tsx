'use client';

import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';

import { cn } from '@/lib/utils';

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuContent = DropdownMenuPrimitive.Content;
const DropdownMenuItem = DropdownMenuPrimitive.Item;

const StyledDropdownMenuContent = ({ className, sideOffset = 8, ...props }: React.ComponentProps<typeof DropdownMenuContent>) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuContent
      sideOffset={sideOffset}
      className={cn('z-50 min-w-[12rem] rounded-xl border border-border bg-white p-1 text-foreground shadow-panel', className)}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
);

const StyledDropdownMenuItem = ({ className, ...props }: React.ComponentProps<typeof DropdownMenuItem>) => (
  <DropdownMenuItem
    className={cn('flex cursor-pointer select-none items-center rounded-lg px-2 py-2 text-sm outline-none transition-colors focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50', className)}
    {...props}
  />
);

export { DropdownMenu, StyledDropdownMenuContent as DropdownMenuContent, StyledDropdownMenuItem as DropdownMenuItem, DropdownMenuTrigger };
