import { useState } from 'react'
import { Download, Lock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { useExportSessions } from '@/hooks/useSessions'
import { usePlan } from '@/hooks/usePlan'
import type { Project } from '@/lib/supabase/queries/projects'

interface ExportPanelProps {
  projects:   Project[]
  totalCount: number
}

const DATE_INPUT_STYLE: React.CSSProperties = {
  height:      36,
  background:  '#222228',
  border:      '1px solid #2E2E38',
  borderRadius: 8,
  padding:     '0 10px',
  fontSize:    13,
  color:       '#E8E6F0',
  colorScheme: 'dark',
  outline:     'none',
  width:       '100%',
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize:      11,
  color:         '#7A7890',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom:  6,
  display:       'block',
}

export function ExportPanel({ projects, totalCount }: ExportPanelProps) {
  const { isPro } = usePlan()
  const { exportSessions, isExporting } = useExportSessions()

  const [fromDate,    setFromDate]    = useState('')
  const [toDate,      setToDate]      = useState('')
  const [projectId,   setProjectId]   = useState<string>('all')
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  if (!isPro) {
    return (
      <>
        <div
          style={{
            background:    '#141417',
            border:        '1px solid #2E2E38',
            borderRadius:  14,
            padding:       '20px 24px',
            marginBottom:  20,
            display:       'flex',
            alignItems:    'center',
            gap:           12,
          }}
        >
          <Lock size={16} style={{ color: '#7A7890', flexShrink: 0 }} />
          <span style={{ fontSize: 14, color: '#7A7890', flex: 1 }}>
            CSV export is a Pro feature
          </span>
          <Button variant="primary" size="sm" onClick={() => setUpgradeOpen(true)}>
            Upgrade to Pro
          </Button>
        </div>

        <UpgradeModal
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          trigger="export"
        />
      </>
    )
  }

  function handleExport() {
    exportSessions({
      startDate: fromDate  || undefined,
      endDate:   toDate    || undefined,
      projectId: projectId === 'all' ? undefined : projectId,
    })
  }

  return (
    <div
      style={{
        background:   '#141417',
        border:       '1px solid #2E2E38',
        borderRadius: 14,
        padding:      '20px 24px',
        marginBottom: 20,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Left: icon + title + badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Download size={18} style={{ color: '#4B9EFF' }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: '#E8E6F0' }}>
            Export Sessions
          </span>
          <span
            style={{
              background:    'rgba(75,158,255,0.12)',
              color:         '#4B9EFF',
              border:        '1px solid rgba(75,158,255,0.25)',
              borderRadius:  4,
              padding:       '2px 8px',
              fontSize:      10,
              fontWeight:    600,
              letterSpacing: '0.08em',
            }}
          >
            CSV
          </span>
        </div>

        {/* Right: export button */}
        <Button
          variant="primary"
          size="sm"
          isLoading={isExporting}
          onClick={handleExport}
        >
          <Download size={14} />
          Export CSV
        </Button>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#2E2E38', margin: '16px 0' }} />

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>

        {/* From */}
        <div style={{ display: 'flex', flexDirection: 'column', width: 148 }}>
          <span style={LABEL_STYLE}>From</span>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            style={DATE_INPUT_STYLE}
          />
        </div>

        {/* To */}
        <div style={{ display: 'flex', flexDirection: 'column', width: 148 }}>
          <span style={LABEL_STYLE}>To</span>
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={e => setToDate(e.target.value)}
            style={DATE_INPUT_STYLE}
          />
        </div>

        {/* Project */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 180 }}>
          <span style={LABEL_STYLE}>Project</span>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger
              style={{
                height:       36,
                minWidth:     180,
                background:   '#222228',
                border:       '1px solid #2E2E38',
                borderRadius: 8,
                fontSize:     13,
                color:        '#E8E6F0',
              }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Session count — right-aligned */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: 'auto' }}>
          {totalCount > 0 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                <span style={{ fontSize: 13, color: '#7A7890', fontWeight: 400 }}>~</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 600, color: '#E8E6F0' }}>
                  {totalCount}
                </span>
              </div>
              <span style={{ fontSize: 11, color: '#7A7890', marginTop: 2 }}>
                sessions to export
              </span>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 600, color: '#3D3B4E' }}>
                  0
                </span>
              </div>
              <span style={{ fontSize: 11, color: '#7A7890', marginTop: 2 }}>
                match your filters
              </span>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
