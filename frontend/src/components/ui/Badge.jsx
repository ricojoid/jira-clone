import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Bug,
  Bookmark,
  Zap,
  GitBranch,
} from 'lucide-react';

export const STATUS_META = {
  todo: { label: 'To Do', className: 'badge-todo', icon: Clock },
  in_progress: { label: 'In Progress', className: 'badge-in_progress', icon: AlertCircle },
  in_review: { label: 'In Review', className: 'badge-in_review', icon: Clock },
  done: { label: 'Done', className: 'badge-done', icon: CheckCircle2 },
};

export const TYPE_META = {
  task: { label: 'Task', color: '#3b82f6', icon: FileText },
  bug: { label: 'Bug', color: '#ef4444', icon: Bug },
  story: { label: 'Story', color: '#22c55e', icon: Bookmark },
  epic: { label: 'Epic', color: '#a855f7', icon: Zap },
  subtask: { label: 'Subtask', color: '#64748b', icon: GitBranch },
};

export const PRIORITY_META = {
  highest: { label: 'Highest', color: '#ef4444' },
  high: { label: 'High', color: '#f97316' },
  medium: { label: 'Medium', color: '#f59e0b' },
  low: { label: 'Low', color: '#3b82f6' },
  lowest: { label: 'Lowest', color: '#22c55e' },
};

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.todo;
  const Icon = meta.icon;

  return (
    <span className={`badge ${meta.className}`}>
      <Icon size={12} />
      {meta.label}
    </span>
  );
}

export function TypeIcon({ type, size = 16 }) {
  const meta = TYPE_META[type] || TYPE_META.task;
  const Icon = meta.icon;
  return <Icon size={size} style={{ color: meta.color }} />;
}

export function PriorityBadge({ priority }) {
  const meta = PRIORITY_META[priority] || PRIORITY_META.medium;

  return (
    <span className="badge" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: meta.color,
          display: 'inline-block',
        }}
      />
      {meta.label}
    </span>
  );
}

import { Calendar, CalendarX, AlertTriangle } from 'lucide-react';
import { getDeadlineStatus } from '../../utils/deadline';

export function DeadlineBadge({ dueDate, status, compact = false }) {
  const info = getDeadlineStatus(dueDate, status);
  if (!info) return null;

  let bg = 'var(--bg-subtle, #f1f5f9)';
  let color = 'var(--text-muted, #64748b)';
  let border = '1px solid var(--border-color, #e2e8f0)';
  let Icon = Calendar;
  let fontWeight = 500;

  if (info.state === 'overdue') {
    bg = 'rgba(239, 68, 68, 0.12)';
    color = '#ef4444';
    border = '1px solid rgba(239, 68, 68, 0.35)';
    Icon = CalendarX;
    fontWeight = 700;
  } else if (info.state === 'today') {
    bg = 'rgba(245, 158, 11, 0.16)';
    color = '#d97706';
    border = '1px solid rgba(245, 158, 11, 0.4)';
    Icon = AlertTriangle;
    fontWeight = 700;
  } else if (info.state === 'soon') {
    bg = 'rgba(234, 179, 8, 0.12)';
    color = '#ca8a04';
    border = '1px solid rgba(234, 179, 8, 0.3)';
    Icon = Clock;
    fontWeight = 600;
  } else if (info.state === 'done') {
    bg = 'rgba(34, 197, 94, 0.1)';
    color = '#16a34a';
    border = '1px solid rgba(34, 197, 94, 0.25)';
    Icon = CheckCircle2;
  }

  return (
    <span
      className="badge"
      title={`Deadline: ${info.formattedDate}`}
      style={{
        backgroundColor: bg,
        color: color,
        border: border,
        fontWeight: fontWeight,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: compact ? '0.675rem' : '0.75rem',
        padding: compact ? '2px 6px' : '3px 8px',
        borderRadius: '6px',
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={compact ? 11 : 13} />
      {compact ? info.text : info.label}
    </span>
  );
}

