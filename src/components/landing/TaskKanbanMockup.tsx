import { PRIORITY_CONFIG } from '@/lib/utils/tasks'

type Status = 'todo' | 'in_progress' | 'done'
type Priority = keyof typeof PRIORITY_CONFIG

// Same tinted backgrounds + accent colors as the real KanbanColumn's local COLUMN_CONFIG.
const STATUS_CONFIG: Record<Status, { bg: string; color: string; label: string }> = {
  todo: { bg: 'rgba(122, 120, 144, 0.06)', color: '#7A7890', label: 'To Do' },
  in_progress: { bg: 'rgba(75, 158, 255, 0.06)', color: '#4B9EFF', label: 'In Progress' },
  done: { bg: 'rgba(61, 214, 140, 0.06)', color: '#3DD68C', label: 'Done' },
}

interface FakeCard {
  title: string
  priority: Priority
  due?: { label: string; overdue?: boolean }
}

const COLUMNS: { status: Status; cards: FakeCard[] }[] = [
  {
    status: 'todo',
    cards: [
      { title: 'Portfolio update', priority: 'high' },
      { title: 'Book chapter', priority: 'low' },
    ],
  },
  {
    status: 'in_progress',
    cards: [
      { title: 'Client proposal', priority: 'urgent', due: { label: 'Yesterday', overdue: true } },
      { title: 'Essay outline', priority: 'medium' },
    ],
  },
  {
    status: 'done',
    cards: [
      { title: 'Invoice sent', priority: 'medium' },
      { title: 'Study notes', priority: 'low' },
    ],
  },
]

function PriorityChip({ priority }: { priority: Priority }) {
  const { label, color } = PRIORITY_CONFIG[priority]
  return (
    <span
      style={{
        backgroundColor: `${color}26`,
        color,
        border: `1px solid ${color}66`,
        borderRadius: 9999,
        padding: '2px 10px',
        fontSize: 11,
        fontWeight: 500,
      }}
    >
      {label}
    </span>
  )
}

function DueChip({ label, overdue }: { label: string; overdue?: boolean }) {
  return (
    <span
      style={{
        backgroundColor: 'transparent',
        color: overdue ? '#F25C5C' : '#7A7890',
        border: overdue ? '1px solid #F25C5C' : '1px solid #2E2E38',
        borderRadius: 6,
        padding: '2px 8px',
        fontSize: 11,
      }}
    >
      {label}
    </span>
  )
}

/**
 * Static illustrative kanban board — three columns styled after the real
 * KanbanColumn/KanbanCard/PriorityBadge, with hardcoded fake tasks. No
 * dnd-kit, no drag-and-drop; purely decorative.
 *
 * The board itself is much shorter than the text column it sits beside;
 * FeatureSection's mockup slot stretches to the row's full height and
 * centers whatever mockup is inside it, so this component only needs to
 * render its own natural content — no local height/centering wrapper
 * needed here. Cards use a plain `data-reveal` (no nested
 * `data-reveal-group`) so they're picked up by the section's own single
 * reveal group, same as every other FeatureSection.
 */
export function TaskKanbanMockup() {
  return (
    <div className="mx-auto w-full" style={{ maxWidth: 440 }}>
      <div
        className="w-full"
        style={{
          backgroundColor: '#0D0D10',
          border: '1px solid #2E2E38',
          borderRadius: 20,
          padding: '28px 22px',
        }}
      >
        <div className="flex w-full" style={{ gap: 6 }}>
          {COLUMNS.map(({ status, cards }) => {
            const cfg = STATUS_CONFIG[status]
            return (
              <div
                key={status}
                className="flex-1"
                style={{
                  minWidth: 0,
                  borderRadius: 12,
                  padding: 8,
                  border: '1px solid rgba(46, 46, 56, 0.8)',
                  backgroundColor: cfg.bg,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Column header — label wraps rather than truncating so
                    "In Progress" stays readable in a narrow mobile column;
                    items-start + a small dot offset keep the dot/badge
                    pinned to the first line instead of centering against
                    the wrapped block. */}
                <div className="flex items-start gap-1.5" style={{ marginBottom: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: cfg.color,
                      flexShrink: 0,
                      marginTop: 3,
                    }}
                  />
                  <span
                    className="flex-1 break-words"
                    style={{ fontSize: 11, fontWeight: 600, color: cfg.color, minWidth: 0 }}
                  >
                    {cfg.label}
                  </span>
                  <span
                    style={{
                      backgroundColor: `${cfg.color}26`,
                      color: cfg.color,
                      borderRadius: 999,
                      padding: '1px 6px',
                      fontSize: 10,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {cards.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex flex-col" style={{ gap: 6 }}>
                  {cards.map((card) => (
                    <div
                      key={card.title}
                      data-reveal
                      className="flex flex-col"
                      style={{
                        borderRadius: 10,
                        padding: 8,
                        backgroundColor: '#141417',
                        border: '1px solid #2E2E38',
                      }}
                    >
                      <PriorityChip priority={card.priority} />
                      <p
                        className="line-clamp-2 leading-snug"
                        style={{ fontSize: 12, fontWeight: 500, color: '#E8E6F0', marginTop: 8 }}
                      >
                        {card.title}
                      </p>
                      {card.due ? (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #2E2E38' }}>
                          <DueChip label={card.due.label} overdue={card.due.overdue} />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
