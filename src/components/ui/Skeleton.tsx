import { cn } from '@/lib/utils/cn'

interface SkeletonProps {
  width?:        string | number
  height?:       string | number
  borderRadius?: string | number
  className?:    string
}

export function Skeleton({ width, height, borderRadius, className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse', className)}
      style={{ backgroundColor: '#222228', width, height, borderRadius }}
    />
  )
}
