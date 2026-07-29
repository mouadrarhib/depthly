"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, updatePositionStrategy = 'always', ...props }, ref) => (
  // Portal is required, not cosmetic: without it Content renders inline
  // wherever its Trigger lives in the tree. The Sidebar's <aside> has both
  // overflow:hidden (to clip the collapsing nav-label text) and a Tailwind
  // transform class (translate-x-0) — and any transform on an ancestor makes
  // it the containing block for position:fixed descendants. Content's Popper
  // wrapper is position:fixed, so without a Portal it gets clipped to the
  // collapsed 60px rail instead of positioning against the viewport, leaving
  // only a sliver of the tooltip bubble visible next to the icon it labels.
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      // 'always' keeps Radix repositioning every frame while open (floating-ui's
      // autoUpdate with animationFrame tracking) instead of only on resize/scroll —
      // the sidebar's icon-rail collapse moves triggers via a CSS width/
      // justify-content transition, which doesn't fire those events on its own.
      updatePositionStrategy={updatePositionStrategy}
      className={cn(
        "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-tooltip-content-transform-origin]",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
