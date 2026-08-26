import { useEffect, useState, type RefObject } from 'react'
import { toCanvas } from 'html-to-image'
import { Clipboard, Download, Share2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAnalyticsWindow } from '@/hooks/usePlanLimits'
import { formatPeriodKey, getPeriodLabel } from '@/lib/utils/analytics'

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly'

async function captureAnalytics(
  node: HTMLElement,
  period: Period,
  date: Date,
  projectLabel?: string
): Promise<Blob> {
  await document.fonts.ready
  const source = await toCanvas(node, {
    backgroundColor: '#0D0D10',
    cacheBust: true,
    pixelRatio: 1.5,
    filter: (element) =>
      !(element instanceof HTMLElement && element.dataset.shareExclude === 'true'),
  })

  const frameWidth = 928
  const maxFrameHeight = 1034
  const scale = Math.min(frameWidth / source.width, maxFrameHeight / source.height)
  const drawWidth = source.width * scale
  const drawHeight = source.height * scale
  const output = document.createElement('canvas')
  output.width = 1080
  output.height = Math.ceil(184 + drawHeight + 104)
  const context = output.getContext('2d')
  if (!context) throw new Error('Canvas is unavailable')

  context.fillStyle = '#0D0D10'
  context.fillRect(0, 0, output.width, output.height)
  context.fillStyle = '#141417'
  context.beginPath()
  context.roundRect(44, 42, 992, output.height - 84, 28)
  context.fill()
  context.fillStyle = '#4B9EFF'
  context.fillRect(44, 42, 8, output.height - 84)

  context.fillStyle = '#E8E6F0'
  context.font = '600 38px Inter'
  context.fillText('DEPTHLY', 88, 105)
  context.fillStyle = '#7A7890'
  context.font = '500 22px Inter'
  const captureLabel = `${getPeriodLabel(date, period)} analytics${projectLabel ? ` · ${projectLabel}` : ''}`
  context.fillText(captureLabel.slice(0, 62), 88, 145)

  const frame = { x: 76, y: 184, width: frameWidth, height: drawHeight }
  const drawX = frame.x + (frame.width - drawWidth) / 2

  context.save()
  context.beginPath()
  context.roundRect(frame.x, frame.y, frame.width, frame.height, 18)
  context.clip()
  context.fillStyle = '#0D0D10'
  context.fillRect(frame.x, frame.y, frame.width, frame.height)
  context.drawImage(source, drawX, frame.y, drawWidth, drawHeight)
  context.restore()

  context.strokeStyle = '#2E2E38'
  context.lineWidth = 2
  context.beginPath()
  context.roundRect(frame.x, frame.y, frame.width, frame.height, 18)
  context.stroke()
  context.fillStyle = '#7A7890'
  context.font = '500 21px Inter'
  context.fillText('Focus deeply. Track your progress.', 88, output.height - 62)
  context.fillStyle = '#4B9EFF'
  context.font = '600 21px Inter'
  context.textAlign = 'right'
  context.fillText('getdepthly.com', 992, output.height - 62)

  return new Promise((resolve, reject) =>
    output.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not create image'))),
      'image/png'
    )
  )
}

export function ShareProgressButton({
  period,
  date,
  targetRef,
  projectLabel,
}: {
  period: Period
  date: Date
  targetRef: RefObject<HTMLDivElement>
  projectLabel?: string
}) {
  const { windowDays, isPro } = useAnalyticsWindow()
  const [open, setOpen] = useState(false)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - (windowDays - 1))
  const locked =
    !isPro && date < new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate())
  const periodKey = formatPeriodKey(date, period)

  useEffect(() => {
    if (!open || !targetRef.current) return
    let active = true
    let objectUrl: string | null = null
    setIsGenerating(true)
    setError(null)
    setBlob(null)
    setPreview(null)
    captureAnalytics(targetRef.current, period, date, projectLabel)
      .then((image) => {
        if (!active) return
        objectUrl = URL.createObjectURL(image)
        setBlob(image)
        setPreview(objectUrl)
      })
      .catch(() => {
        if (active) setError('Could not capture this analytics view.')
      })
      .finally(() => {
        if (active) setIsGenerating(false)
      })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [date, open, period, projectLabel, targetRef])

  const projectSlug = projectLabel
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  const imageFile = () =>
    blob
      ? new File([blob], `depthly-${periodKey}${projectSlug ? `-${projectSlug}` : ''}.png`, {
          type: 'image/png',
        })
      : null
  const download = () => {
    const image = imageFile()
    if (!image) return
    const url = URL.createObjectURL(image)
    const link = document.createElement('a')
    link.href = url
    link.download = image.name
    link.click()
    URL.revokeObjectURL(url)
  }
  const share = async () => {
    const image = imageFile()
    if (!image) return
    try {
      if (navigator.canShare?.({ files: [image] }))
        await navigator.share({ title: 'My Depthly analytics', files: [image] })
      else download()
    } catch (cause) {
      if ((cause as DOMException).name !== 'AbortError')
        setError('Sharing failed. Download the image instead.')
    }
  }
  const copy = async () => {
    if (!blob || !('ClipboardItem' in window)) {
      download()
      return
    }
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    } catch {
      setError('Copy is unavailable. Download the image instead.')
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={locked}
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Share2 className="h-4 w-4" />
        Share Progress
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-depth-border bg-depth-surface">
          <DialogHeader>
            <DialogTitle className="text-ink-primary">Share this analytics view</DialogTitle>
          </DialogHeader>
          {preview ? (
            <img
              src={preview}
              alt="Captured Depthly analytics interface"
              className="mx-auto max-h-[58vh] rounded-[14px] border border-depth-border"
            />
          ) : (
            <div className="flex h-80 items-center justify-center rounded-[14px] bg-depth-raised text-[13px] text-ink-muted">
              {isGenerating ? 'Capturing charts and analytics…' : 'No preview available'}
            </div>
          )}
          {error ? <p className="text-[12px] text-red-400">{error}</p> : null}
          <DialogFooter>
            <Button variant="ghost" onClick={copy} disabled={!blob} className="gap-2">
              <Clipboard className="h-4 w-4" />
              Copy
            </Button>
            <Button variant="ghost" onClick={download} disabled={!blob} className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button variant="primary" onClick={share} disabled={!blob} className="gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
