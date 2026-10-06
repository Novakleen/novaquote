import React from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { cn } from '@/lib/utils';

const ScrollArea = React.forwardRef(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root>
    <ScrollAreaPrimitive.Viewport ref={ref} className={cn('h-full w-full rounded-[inherit]', className)} {...props}>
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollAreaPrimitive.Scrollbar orientation="vertical" className="flex touch-none select-none transition-colors p-0.5 bg-transparent hover:bg-gray-200">
      <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-gray-400 hover:bg-gray-500" />
    </ScrollAreaPrimitive.Scrollbar>
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));

ScrollArea.displayName = 'ScrollArea';

export { ScrollArea };