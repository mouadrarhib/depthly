import { BarChart3, Download, Share2 } from 'lucide-react'

const BARS = [38, 62, 46, 82, 58, 92, 74]

export function ShareProgressMockup() {
  return (
    <div className="mx-auto w-full max-w-[430px] rounded-[20px] border border-depth-border bg-depth-raised p-3 sm:p-4">
      <div className="overflow-hidden rounded-[14px] border border-depth-border bg-depth-bg">
        <div className="flex items-center justify-between border-b border-depth-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-brand/30 text-brand">
              <BarChart3 size={13} />
            </span>
            <span className="text-[12px] font-medium text-ink-primary">Depthly Analytics</span>
          </div>
          <span className="font-data text-[10px] text-ink-muted">JUL 14–20</span>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-depth-border bg-depth-surface p-3">
              <p className="text-[10px] text-ink-muted">Focus time</p>
              <p className="font-data mt-1 text-xl text-ink-primary">14h 20m</p>
            </div>
            <div className="rounded-lg border border-depth-border bg-depth-surface p-3">
              <p className="text-[10px] text-ink-muted">Sessions</p>
              <p className="font-data mt-1 text-xl text-ink-primary">18</p>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-depth-border bg-depth-surface p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] text-ink-muted">Focus by day</span>
              <span className="font-data text-[10px] text-brand">Goal 12h</span>
            </div>
            <div className="flex h-[92px] items-end gap-2">
              {BARS.map((height, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-1">
                  <span className="w-full rounded-t bg-brand/70" style={{ height: `${height}%` }} />
                  <span className="font-data text-[8px] text-ink-muted">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-depth-border pt-3">
            <div>
              <p className="text-[11px] font-medium text-ink-primary">
                A real view, ready to share
              </p>
              <p className="mt-0.5 text-[9px] text-ink-muted">getdepthly.com</p>
            </div>
            <div className="flex gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-depth-border text-ink-secondary">
                <Download size={14} />
              </span>
              <span className="flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3 text-[10px] font-medium text-white">
                <Share2 size={13} /> Share
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
